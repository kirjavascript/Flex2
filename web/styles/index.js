const COLORS = {
    grey: '#282C34',
    lightgrey: '#ABB2BF',
    lightergrey: '#ABB2BF',
    red: '#E06C75',
    red2: '#BE5046',
    green: '#98C379',
    yellow: '#E5C07B',
    yellow2: '#D19A66',
    blue: '#61AFEF',
    magenta: '#C678DD',
    cyan: '#56B6C2',
    white: '#ABB2BF',
    white2: '#5C6370',
};

// html
Object.assign(document.documentElement.style, {
    userSelect: 'none',
    overflow: 'hidden',
});

// body
Object.assign(document.body.style, {
    margin: 0,
    cursor: 'default',
    backgroundColor: COLORS.grey,
    color: COLORS.white,
    fontSize: '14px',
    fontFamily: 'Hacker',
    fontWeight: 700,
});
