import Ikoni from "./ikoni.js"
Ikoni({
    shouldSave: true,
    shouldCache: true,
    outdir: './icons',
    namespace: 'x-icon',
    sizes: {
        'small': '.875rem',
        'medium': '1.125rem',
        'large': '1.375rem',
    }
}).generate([
    'mdi:account',
    'mdi:account-alert',
    'bx:abacus',
    'fa6-brands:500px',
    // 'fa6:*' // all icons?
])