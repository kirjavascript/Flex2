const fs = require('fs');
const esbuild = require('esbuild');
const path = require('path');

module.exports = (mainWindow) => {
    const { writeFile, unlinkSync, existsSync } = fs;

    mainWindow?.openDevTools();
    if (existsSync('./static/bundles/main.js')) {
        unlinkSync('./static/bundles/main.js');
    }

    const devMode = !!mainWindow;

    esbuild
        .build({
            entryPoints: ['./app/main.js'],
            outdir: './static/bundles',
            bundle: true,
            watch: devMode,
            sourcemap: devMode,
            minify: !devMode,
            platform: 'node',
            format: 'iife',
            metafile: true,
            banner: {
                js: `'use strict';\n`,
            },
            plugins: [
                sassVarsPlugin(),
                aliasPlugin(),
                statsPlugin(),
                {
                    name: 'reload',
                    setup(build) {
                        build.onEnd((result) => {
                            if (result.metafile) {
                                mainWindow?.reload();
                            }
                        });
                    },
                },
            ],
            define: {
                __DEV__: String(devMode),
                __REACT_DEVTOOLS_GLOBAL_HOOK__: '{ "isDisabled": true }',
            },
            external: ['electron'],
            loader: {
                '.js': 'jsx',
                '.md': 'text',
            },
        })
        .catch(() => {
            process.exit(1); // return a non-zero exit code
        });

    const sass = require('node-sass');

    const buildSass = () => {
        sass.render({ file: 'styles/main.scss' }, (err, result) => {
            if (err) return console.error(err);
            writeFile(
                './static/bundles/main.css',
                result.css.toString(),
                (err) => {
                    if (err) return console.error(err);
                    mainWindow?.reload();
                    console.log('SCSS Compiled');
                },
            );
        });
    };

    buildSass();

    if (devMode) {
        require('chokidar')
            .watch('./styles', { ignored: /[\/\\]\./ })
            .on('change', buildSass);
    }
};

const aliases = {
    '#store': __dirname + '/../app/store',
    '#components': __dirname + '/../app/components',
    '#controls': __dirname + '/../app/controls',
    '#ui': __dirname + '/../app/components/ui',
    '#util': __dirname + '/../app/util',
    '#lib': __dirname + '/../app/lib',
    '#formats': __dirname + '/../app/formats',
    '#styles': __dirname + '/../styles/',
};

const aliasPlugin = () => ({
    name: 'alias',
    setup(build) {
        build.onResolve({ filter: /^#/ }, (args) => {
            const [head, ...tail] = args.path.split('/');
            return {
                path: require.resolve(
                    path.resolve(
                        __dirname,
                        '../../',
                        [aliases[head], ...tail].join('/'),
                    ),
                ),
            };
        });
    },
});

const sassVars = Object.fromEntries(
    fs
        .readFileSync('./styles/variables.scss', 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('$'))
        .map((line) => [
            line.match(/\$(.*?):/)[1].trim(),
            line.match(/:(.*?);/)[1].trim(),
        ]),
);
fs.writeFileSync(
    './styles/variables.js',
    `module.exports = ${JSON.stringify(sassVars, null, 4)};`,
    'utf8',
);

const sassVarsPlugin = () => ({
    name: 'colors',
    setup(build) {
        build.onResolve({ filter: /sass-variables/ }, async (_args) => {
            return {
                path: path.resolve('./styles/variables.js'),
            };
        });
    },
});

const statsPlugin = () => ({
    name: 'stats',
    setup(build) {
        build.onStart(() => {
            console.time('build time');
        });
        build.onEnd((result) => {
            if (result.metafile) {
                Object.entries(result.metafile.outputs).forEach(
                    ([file, { bytes }]) => {
                        const relPath = path.relative(
                            process.cwd(),
                            path.resolve(__dirname, file),
                        );

                        const i = Math.floor(Math.log(bytes) / Math.log(1024));
                        const humanBytes =
                            (bytes / Math.pow(1024, i)).toFixed(2) * 1 +
                            ['B', 'kB', 'MB', 'GB', 'TB'][i];
                        console.info(relPath, humanBytes);
                    },
                );
            } else {
                if ('errors' in result) {
                    console.info(
                        `build failed with ${result.errors.length} errors, ${result.warnings.length} warnings`,
                    );
                } else {
                    console.error(result);
                }
            }
            console.timeEnd('build time');
        });
    },
});
