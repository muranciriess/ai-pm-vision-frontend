/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Taro 小程序不支持 JIT 的部分特性，使用安全列表确保关键样式生成
  safelist: [
    'bg-slate-900', 'bg-slate-800', 'bg-blue-600', 'bg-blue-500',
    'bg-yellow-400', 'bg-emerald-500', 'bg-purple-600',
    'text-white', 'text-slate-900', 'text-blue-600', 'text-blue-500',
    'text-yellow-400', 'text-emerald-400', 'text-slate-400', 'text-slate-500',
    'border-blue-600', 'border-slate-700', 'border-slate-200',
    'shadow-xl', 'shadow-2xl', 'shadow-blue-500/20',
    'rounded-2xl', 'rounded-xl', 'rounded-lg', 'rounded-full',
    'font-black', 'font-bold', 'font-semibold', 'font-medium',
    'grid-cols-2', 'grid-cols-1',
    'flex', 'flex-col', 'flex-row', 'items-center', 'justify-center',
    'gap-2', 'gap-3', 'gap-4', 'gap-6',
    'p-4', 'p-6', 'p-8', 'px-4', 'px-6', 'py-2', 'py-3', 'py-4',
    'mt-2', 'mt-4', 'mt-6', 'mt-8', 'mb-2', 'mb-4', 'mb-6',
    'w-full', 'w-8', 'w-10', 'h-8', 'h-10', 'min-h-screen',
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
    'leading-tight', 'leading-relaxed', 'tracking-tight', 'tracking-wide',
    'opacity-60', 'opacity-80',
    'overflow-hidden', 'overflow-y-auto',
    'border', 'border-l-4', 'border-b',
    'pl-4', 'pr-4',
  ],
  theme: {
    extend: {
      colors: {
        // 克莱因蓝 Klein Blue
        klein: {
          DEFAULT: '#002FA7',
          light: '#1a4fc7',
          dark: '#001e7a',
        },
        // 品牌色系
        brand: {
          primary: '#002FA7',
          accent: '#FF4D00',
          highlight: '#FFE500',
        },
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        'magazine': '8px 8px 0px 0px rgba(0, 47, 167, 0.15)',
        'card': '0 20px 60px -10px rgba(0, 0, 0, 0.15)',
        'dark-card': '0 20px 60px -10px rgba(0, 47, 167, 0.3)',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
  // 小程序环境下关闭 preflight reset，防止与原生样式冲突
  corePlugins: {
    preflight: false,
  },
}
