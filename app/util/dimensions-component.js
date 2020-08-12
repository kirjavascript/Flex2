import { Component } from 'react';

export class DimensionsComponent extends Component {

    state = {};
    mounted = false;
    onScroll = (e) => {
        this.mounted &&
            this.setState({scroll: e.target.scrollTop});
        e.target.blur();
    };

    componentDidMount() {
        this.mounted = true;
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.mounted &&
                    this.setState({width, height});
            });
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        this.node.removeEventListener('scroll', this.onScroll);
    }

    onContainerRef = (node) => {
        if (node) {
            node.addEventListener('scroll', this.onScroll);
            requestAnimationFrame(() => {
                const { width, height } = node.getBoundingClientRect();
                const scroll = node.scrollTop;
                this.mounted &&
                    this.setState({width, height, scroll});
            });
            this.node = node;
        }
    };
}
