import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

console.log("Building ....")
await esbuild.build({
    entryPoints: ['./main.ts'],
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    format: 'esm',
    color: true,
    outdir: '../public/',
    plugins: [sassPlugin({
        type: 'css',
    })],
}).catch((ex) =>
{
    console.error(ex)
    process.exit(1)
}).then(() =>
console.log("Build complete")
)