import React from 'react';
import { render } from 'react-dom';
import { Layout } from '#components/layout';

import './controls/keyboard';
import './components/import';

render(
    <Layout/>,
    document.body.appendChild(document.createElement('div'))
);

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    return false;
},false);

document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
},false);

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments);},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m);
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-109339588-1', 'auto');
ga('send', 'pageview');
