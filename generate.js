import Ikoni from "./ikoni.js"
Ikoni({
    shouldSave: true,
    shouldCache: false,
    outdir: './icons'
}).generate([
    'mdi:account',
    'mdi:account-alert',
    'bx:abacus',
    'fa6-brands:500px',
])