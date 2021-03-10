import React, { Component, Children, cloneElement } from 'react';
import PropTypes from 'prop-types';

class FileThemeTreeNodeRenderer extends Component {
    render() {
        const {
            children,
            listIndex,
            swapFrom,
            swapLength,
            swapDepth,
            scaffoldBlockPxWidth,
            lowerSiblingCounts,
            connectDropTarget,
            isOver,
            draggedNode,
            canDrop,
            treeIndex,
            treeId, // Delete from otherProps
            getPrevRow, // Delete from otherProps
            node, // Delete from otherProps
            path, // Delete from otherProps
            rowDirection,
            ...otherProps
        } = this.props;

        return connectDropTarget(
            <div {...otherProps} className="node">
                {Children.map(children, child =>
                    cloneElement(child, {
                        isOver,
                        canDrop,
                        draggedNode,
                        lowerSiblingCounts,
                        listIndex,
                        swapFrom,
                        swapLength,
                        swapDepth,
                    })
                )}
            </div>
        );
    }
}

FileThemeTreeNodeRenderer.defaultProps = {
    swapFrom: null,
    swapDepth: null,
    swapLength: null,
    canDrop: false,
    draggedNode: null,
};

FileThemeTreeNodeRenderer.propTypes = {
    treeIndex: PropTypes.number.isRequired,
    treeId: PropTypes.string.isRequired,
    swapFrom: PropTypes.number,
    swapDepth: PropTypes.number,
    swapLength: PropTypes.number,
    scaffoldBlockPxWidth: PropTypes.number.isRequired,
    lowerSiblingCounts: PropTypes.arrayOf(PropTypes.number).isRequired,

    listIndex: PropTypes.number.isRequired,
    children: PropTypes.node.isRequired,

    // Drop target
    connectDropTarget: PropTypes.func.isRequired,
    isOver: PropTypes.bool.isRequired,
    canDrop: PropTypes.bool,
    draggedNode: PropTypes.shape({}),

    // used in dndManager
    getPrevRow: PropTypes.func.isRequired,
    node: PropTypes.shape({}).isRequired,
    path: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ).isRequired,
    rowDirection: PropTypes.string.isRequired,
};
function isDescendant(older, younger) {
    return (
        !!older.children &&
        typeof older.children !== 'function' &&
        older.children.some(
            (child) => child === younger || isDescendant(child, younger),
        )
    );
}

// eslint-disable-next-line react/prefer-stateless-function
class FileThemeNodeContentRenderer extends Component {
    render() {
        const {
            scaffoldBlockPxWidth,
            toggleChildrenVisibility,
            connectDragPreview,
            connectDragSource,
            isDragging,
            canDrop,
            canDrag,
            node,
            title,
            draggedNode,
            path,
            treeIndex,
            isSearchMatch,
            isSearchFocus,
            icons,
            buttons,
            className,
            style,
            didDrop,
            lowerSiblingCounts,
            listIndex,
            swapFrom,
            swapLength,
            swapDepth,
            treeId, // Not needed, but preserved for other renderers
            isOver, // Not needed, but preserved for other renderers
            parentNode, // Needed for dndManager
            rowDirection,
            ...otherProps
        } = this.props;
        const nodeTitle = title || node.title;

        const isDraggedDescendant =
            draggedNode && isDescendant(draggedNode, node);
        const isLandingPadActive = !didDrop && isDragging;

        // Construct the scaffold representing the structure of the tree
        const scaffold = [];
        lowerSiblingCounts.forEach((lowerSiblingCount, i) => {
            scaffold.push(
                <div
                    key={`pre_${1 + i}`}
                    style={{ width: scaffoldBlockPxWidth }}
                    className="lineBlock"
                />,
            );

            if (treeIndex !== listIndex && i === swapDepth) {
                // This row has been shifted, and is at the depth of
                // the line pointing to the new destination
                let highlightLineClass = '';

                if (listIndex === swapFrom + swapLength - 1) {
                    // This block is on the bottom (target) line
                    // This block points at the target block (where the row will go when released)
                    highlightLineClass = 'highlightBottomLeftCorner';
                } else if (treeIndex === swapFrom) {
                    // This block is on the top (source) line
                    highlightLineClass = 'highlightTopLeftCorner';
                } else {
                    // This block is between the bottom and top
                    highlightLineClass = 'highlightLineVertical';
                }

                scaffold.push(
                    <div
                        key={`highlight_${1 + i}`}
                        style={{
                            width: scaffoldBlockPxWidth,
                            left: scaffoldBlockPxWidth * i,
                        }}
                        className={`${'absoluteLineBlock'} ${highlightLineClass}`}
                    />,
                );
            }
        });

        const nodeContent = (
            <div style={{ height: '100%' }} {...otherProps}>
                {toggleChildrenVisibility &&
                        node.children &&
                        node.children.length > 0 && (
                            <button
                                type="button"
                                aria-label={node.expanded ? 'Collapse' : 'Expand'}
                                className={
                                    node.expanded
                                        ? 'collapseButton'
                                        : 'expandButton'
                                }
                                style={{
                                    left:
                                    (lowerSiblingCounts.length - 0.7) *
                                    scaffoldBlockPxWidth,
                                }}
                                onClick={() =>
                                    toggleChildrenVisibility({
                                        node,
                                        path,
                                        treeIndex,
                                    })
                                }
                            />
                        )}

                <div
                    className={
                        'rowWrapper' +
                        (!canDrag ? ` ${'rowWrapperDragDisabled'}` : '')
                    }
                >
                    {/* Set the row preview to be used during drag and drop */}
                    {connectDragPreview(
                        <div style={{ display: 'flex' }}>
                            {scaffold}
                            <div
                                className={
                                    'row' +
                                    (isLandingPadActive
                                        ? ` ${'rowLandingPad'}`
                                        : '') +
                                    (isLandingPadActive && !canDrop
                                        ? ` ${'rowCancelPad'}`
                                        : '') +
                                    (isSearchMatch
                                        ? ` ${'rowSearchMatch'}`
                                        : '') +
                                    (isSearchFocus
                                        ? ` ${'rowSearchFocus'}`
                                        : '') +
                                    (className ? ` ${className}` : '')
                                }
                                style={{
                                    opacity: isDraggedDescendant ? 0.5 : 1,
                                    ...style,
                                }}
                            >
                                <div
                                    className={
                                        'rowContents' +
                                        (!canDrag
                                            ? ` ${'rowContentsDragDisabled'}`
                                            : '')
                                    }
                                >
                                    <div className={'rowToolbar'}>
                                        {icons.map((icon, index) => (
                                            <div
                                                key={index} // eslint-disable-line react/no-array-index-key
                                                className={'toolbarButton'}
                                            >
                                                {icon}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={'rowLabel'}>
                                        <span className={'rowTitle'}>
                                            {typeof nodeTitle === 'function'
                                                ? nodeTitle({
                                                    node,
                                                    path,
                                                    treeIndex,
                                                })
                                                : nodeTitle}
                                        </span>
                                    </div>

                                    <div className={'rowToolbar'}>
                                        {buttons.map((btn, index) => (
                                            <div
                                                key={index} // eslint-disable-line react/no-array-index-key
                                                className={'toolbarButton'}
                                            >
                                                {btn}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>,
                    )}
                </div>
            </div>
        );

        return canDrag
            ? connectDragSource(nodeContent, { dropEffect: 'copy' })
            : nodeContent;
    }
}

FileThemeNodeContentRenderer.defaultProps = {
    buttons: [],
    canDrag: false,
    canDrop: false,
    className: '',
    draggedNode: null,
    icons: [],
    isSearchFocus: false,
    isSearchMatch: false,
    parentNode: null,
    style: {},
    swapDepth: null,
    swapFrom: null,
    swapLength: null,
    title: null,
    toggleChildrenVisibility: null,
};

FileThemeNodeContentRenderer.propTypes = {
    buttons: PropTypes.arrayOf(PropTypes.node),
    canDrag: PropTypes.bool,
    className: PropTypes.string,
    icons: PropTypes.arrayOf(PropTypes.node),
    isSearchFocus: PropTypes.bool,
    isSearchMatch: PropTypes.bool,
    listIndex: PropTypes.number.isRequired,
    lowerSiblingCounts: PropTypes.arrayOf(PropTypes.number).isRequired,
    node: PropTypes.shape({}).isRequired,
    path: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ).isRequired,
    scaffoldBlockPxWidth: PropTypes.number.isRequired,
    style: PropTypes.shape({}),
    swapDepth: PropTypes.number,
    swapFrom: PropTypes.number,
    swapLength: PropTypes.number,
    title: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    toggleChildrenVisibility: PropTypes.func,
    treeIndex: PropTypes.number.isRequired,
    treeId: PropTypes.string.isRequired,
    rowDirection: PropTypes.string.isRequired,

    // Drag and drop API functions
    // Drag source
    connectDragPreview: PropTypes.func.isRequired,
    connectDragSource: PropTypes.func.isRequired,
    didDrop: PropTypes.bool.isRequired,
    draggedNode: PropTypes.shape({}),
    isDragging: PropTypes.bool.isRequired,
    parentNode: PropTypes.shape({}), // Needed for dndManager
    // Drop target
    canDrop: PropTypes.bool,
    isOver: PropTypes.bool.isRequired,
};

export default {
    nodeContentRenderer: FileThemeNodeContentRenderer,
    treeNodeRenderer: FileThemeTreeNodeRenderer,
    scaffoldBlockPxWidth: 25,
    rowHeight: 25,
    slideRegionSize: 50,
};
