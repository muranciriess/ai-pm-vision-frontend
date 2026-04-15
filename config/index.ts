import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'ai-pm-vision',
  date: '2026-04-15',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-platform-h5',
  ],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
      cssModules: {
        enable: false,
      },
    },
    webpackChain(chain) {
      chain.resolve.alias.set('@', require('path').resolve(__dirname, '..', 'src'))
    },
  },
  h5: {
    publicPath: process.env.TARO_APP_PUBLIC_PATH || '/',
    staticDirectory: 'static',
    template: require('path').resolve(__dirname, '..', 'public/index.html'),
    devServer: {
      port: 10086,
      static: false,
      historyApiFallback: true,
    },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
      },
    },
    webpackChain(chain) {
      chain.resolve.alias.set('@', require('path').resolve(__dirname, '..', 'src'))
      // 注入 HtmlWebpackPlugin，生成带 script 标签的 index.html
      const HtmlWebpackPlugin = require('html-webpack-plugin')
      chain.plugin('html').use(HtmlWebpackPlugin, [{
        template: require('path').resolve(__dirname, '..', 'public/index.html'),
        filename: 'index.html',
        inject: true,
      }])
    },
  },
})
