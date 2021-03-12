import React from 'react';
import { observable, action, toJS, computed, runInAction, autorun } from 'mobx';
import { observer } from 'mobx-react';
import { render } from 'react-dom';
import util from 'util';
import { Button } from '#ui';

const inspect = (obj) => util.inspect(toJS(obj));

class MapLogger {
    @observable enabled = true;
    @observable log = [];
    @observable queue = [];
    @action msg = (...objs) => {
        this.queue.push(objs.map(inspect));
    };
    @action drain = () => {
        while (this.queue.length) {
            this.log.push(this.queue.shift());
        }
    };
    @action clear = () => this.log.replace([]);
    @computed get output() {
        return this.log.map((item) => item.join` `).join`\n`;
    }
}

const log = new MapLogger();

autorun(
    () => {
        log.queue.length;
        log.drain();
    },
    { delay: 100 },
);

export const logger = (...args) => {
    log.msg(...args);
};

window.log = log;

const Debug = observer(function () {
    return (
        log.enabled && (
            <div
                style={{
                    border: '1px solid limegreen',
                    borderRadius: 5,
                    padding: 5,
                    margin: 5,
                    height: '100%',
                    width: 500,
                    overflowY: 'scroll',
                    color: 'limegreen',
                    backgroundColor: 'black',
                    fontWeight: 'bold',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10,
                }}
            >
                <div>
                    <Button
                        color="green"
                        onClick={() => {
                            log.enabled = false;
                        }}
                    >
                        X
                    </Button>
                    <Button color="green" onClick={log.clear}>
                        clear
                    </Button>
                </div>
                <pre>{log.output}</pre>
            </div>
        )
    );
});

__DEV__ &&
    render(<Debug />, document.body.appendChild(document.createElement('div')));
