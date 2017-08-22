// const { remote } = require('electron').remote;
// http://ourcodeworld.com/articles/read/288/how-to-handle-drag-and-drop-file-feature-in-electron-framework
// https://github.com/veltman/flubber + react-motion
// react ui framework
// webpack in seperate process, use chokidar to watch web/

// breadcrumbs like vim airline
// get comment colour
// use a project tree
// ; command mode - list commands in help
// .flex
//


const { observable, computed, action, autorun } = require('mobx');
const { observer } = require('mobx-react');

class Thing {
    @observable v = 7;
}

let thing = new Thing();

const React = require('react');
const { render } = require('react-dom');

@observer
class Test extends React.Component {

    render() {
        return <div>
            <input type="range" onChange={(e) => {
                thing.v = (e.target.value);
            }}/>
            {thing.v}
        </div>;
    }

}

render(<Test/>, document.body.appendChild(document.createElement('div')));
