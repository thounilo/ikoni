import Fs from 'fs-extra'

export async function saveFile(filepath, content) {
    try {
        await Fs.ensureFile(filepath)
        await Fs.writeFile(filepath, content, 'utf8')
    } catch { }
}

export async function fetchJSON(url, opts = {}) {
    const options = Object.assign({
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
    }, opts)
    return await (await fetch(url, options)).json()
}

export async function generateCustomData(tag, attributes) {
    let customData = {
        version: '1.0',
        tags: [
            {
                name: tag,
                description: 'Custom Ikoni icons',
                attributes: attributes.map(a => ({
                    name: a.icon
                }))
            }
        ]
    }
    return customData
}