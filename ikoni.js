import Fs from 'fs-extra'
import svgDataUri from 'mini-svg-data-uri'
import { saveFile, fetchJSON, generateCustomData } from './utils.js'

/*
  * [base]                            [user]   [repo]     [branch] [path]
  * https://raw.githubusercontent.com /iconify /icon-sets /master  /collections.json
*/
function Ikoni(opts = {}) {
    const _ = Object.assign({
        svg: false,
        /** Adds background-image for all icons */
        preserve: false,
        /** Should save generated files to filesystem */
        shouldSave: true,
        /** Should save remote json data to filesystem */
        shouldCache: true,
        /** Path for save files */
        outdir: './',
        /** Name of selector ex. tag, class, data-icon */
        namespace: 'any-icon',
        /** Where remote files located */
        remote: 'https://raw.githubusercontent.com/iconify/icon-sets/master/json',
        /** Custom size classes for icons */
        sizes: {
            'small': '.875rem',
            'medium': '1.125rem',
            'large': '1.375rem',
        }
    }, opts)

    const toDataUri = ({ pathData, width, height }) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ width } ${ height ?? width }">${ pathData }</svg>`)

    async function _fetch(iconNames, shouldCache) {

        let collections = [...new Set(iconNames.map(icon => icon.split(':')[0]))]
        let iconSets = []

        for (let collection of collections) {
            let isLocal = true
            try {
                let file = await Fs.readFile(`${ _.outdir }/${ collection }.json`, 'utf8')
                iconSets.push(JSON.parse(file))
                console.log('💾', `${ collection }.json`)
            } catch { isLocal = false }

            if (!isLocal) {
                try {
                    let file = await fetchJSON(`${ _.remote }/${ collection }.json`)
                    iconSets.push(file)
                    console.log('🌐', `${ _.remote }/${ collection }.json`)
                    if (shouldCache) {
                        await saveFile(`${ _.outdir }/${ collection }.json`, JSON.stringify(file, null, 2))
                        console.log('🔽', `${ collection }.json`)
                    }
                } catch (err) { console.log(err.message) }
            }
        }

        await Promise.all(iconSets)
        /**
         * Get iconify collection of icons
         */
        return [...new Set(iconNames)]
            .map(async (name) => {
                /**
                 * collection:name ex. gis:bicycle
                 */
                const [collectionName, iconName] = name.split(':')
                if (!collectionName || !iconName) {
                    console.log('Invalid collectionName or iconName got: ', collectionName, iconName)
                    return
                }
                let currentSet = iconSets.find(i => i.prefix === collectionName)
                /**
                 * Checks for found icon
                 */
                const icon = currentSet?.icons?.[iconName]
                if (!icon)
                    return

                const dataUrl = toDataUri({
                    width: icon?.width ?? currentSet.width,
                    height: icon?.height ?? currentSet.height,
                    pathData: icon?.body
                })

                return { collection: collectionName, name: iconName, data: dataUrl, pathData: icon?.body }
            })
    }

    async function createIconsData(list) {
        return list
            .filter(Boolean)
            .map(({ collection, name, data, pathData }) => {
                let icon = `${ collection }-${ name }`

                return {
                    declaration: `--${ icon }: url("${ data }");`,
                    variable: `--${ icon }`,
                    selector: `.${ icon }`,
                    icon,
                    data,
                    collection,
                    pathData,
                }
            })
    }

    function css(strings) {
        // $FlowFixMe: Flow doesn't undestand .raw
        var raw = typeof strings === "string" ? [strings] : strings.raw
        // first, perform interpolation
        var result = ""
        for (var i = 0;i < raw.length;i++) {
            result += raw[i].
                // join lines when there is a suppressed newline
                replace(/\\\n[ \t]*/g, "").

                // handle escaped backticks
                replace(/\\`/g, "`")

            if (i < (arguments.length <= 1 ? 0 : arguments.length - 1)) {
                result += arguments.length <= i + 1 ? undefined : arguments[i + 1]
            }
        }

        // now strip indentation
        var lines = result.split("\n")
        var mindent = null
        lines.forEach(function (l) {
            var m = l.match(/^(\s+)\S+/)
            if (m) {
                var indent = m[1].length
                if (!mindent) {
                    // this is the first indented line
                    mindent = indent
                } else {
                    mindent = Math.min(mindent, indent)
                }
            }
        })

        if (mindent !== null) {
            (function () {
                var m = mindent // appease Flow
                result = lines.map(function (l) {
                    return l[0] === " " ? l.slice(m) : l
                }).join("\n")
            })()
        }

        return result.
            // dedent eats leading and trailing whitespace too
            trim().
            // handle escaped newlines at the end to ensure they don't get stripped too
            replace(/\\n/g, "\n")
    }

    return {
        async generate(icons) {

            if (!icons)
                return

            let iconsets = await _fetch(icons, _.shouldCache)
            let resolved = await Promise.all(iconsets)
            let data = await createIconsData(resolved)

            let variables = css`:root { ${ data.map(({ declaration }) => declaration).join('\n') } }`

            let classes = css`:where(${ _.namespace }) { 
                display: inline-block;
    
                --size: 1.125rem;
                block-size: var(--_width, var(--size));
                inline-size: var(--_height, var(--size));
    
                background-color: currentColor;
                /* --fill: 270 42% 66%; */
                /* --opacity: 1; */
                /* background-color: var(--hex, hsl(var(--fill) / var(--opacity))); */
                
            }`
            if (_?.sizes) {
                classes += css`${ Object.entries(_.sizes).map(([size, value]) => `${ _.namespace }[${ size }] { --size: ${ value }; }`).join('\n') }`
            }
            /**
             * @see https://codepen.io/noahblon/post/coloring-svgs-in-css-background-images#css-masks-1
             */
            classes += css`\n${ data.map(
                ({ selector, variable, icon }) => css`
                :where([${ icon }]) {
                    -webkit-mask: var(${ variable });
                    mask: var(${ variable }); ${ _.preserve ? `background-image: var(${ variable });` : '' }}`.trim()
            ).join('\n') }`

            let cd = await generateCustomData(_.namespace, data)

            await saveFile('./icons/ikoni-data.json', JSON.stringify(cd, null, 4))

            if (_.shouldSave) {
                await saveFile(`${ _.outdir }/variables.css`, variables)
                await saveFile(`${ _.outdir }/classes.css`, classes)
            }
            if (_.svg) {
                data.forEach(async d => {
                    await saveFile(`${ _.outdir }/${ d.collection }/${ d.icon }.svg`, `<svg>${ d.pathData }</svg>`)
                })
            }
            return data
        },
    }
}

export default Ikoni

// classes += css`\n${ data.map(
//     ({ selector, variable, icon }) => css`
//     :where(${ selector }, [data-ikoni="${ icon }"], [${ icon }]) {
//         -webkit-mask: var(${ variable });
//         mask: var(${ variable }); ${ _.preserve ? `background-image: var(${ variable });` : '' }}`.trim()
// ).join('\n') }`