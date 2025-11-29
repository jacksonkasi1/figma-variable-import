import { on, showUI } from '@create-figma-plugin/utilities'

export default function () {
  on('CREATE_TOKENS', async (tokens: any) => {
    const core = tokens.core
    if (!core) {
      figma.notify('Invalid token file: missing "core" property', { error: true })
      return
    }

    try {
      await createColorTokens(core.color)
      await createTypographyTokens(core.typography)
      await createDimensionTokens('Spacing', core.space)
      await createDimensionTokens('Radii', core.radii)
      
      figma.notify('Tokens created successfully!')
    } catch (error: any) {
      console.error(error)
      figma.notify(`Error creating tokens: ${error.message}`, { error: true })
    }
  })

  showUI({
    height: 300,
    width: 320
  })
}

async function createColorTokens(colors: Record<string, string>) {
  if (!colors) return

  // Create or find a variable collection
  const collectionName = 'Colors'
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName)
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName)
    collection.renameMode(collection.modes[0].modeId, 'Default')
  }
  const modeId = collection.modes[0].modeId

  for (const [name, hex] of Object.entries(colors)) {
    // Convert hex to RGBA
    const rgba = hexToRgba(hex)
    if (!rgba) continue

    // Create variable
    let variable = figma.variables.getLocalVariables().find(v => v.name === name && v.variableCollectionId === collection!.id)
    if (!variable) {
      variable = figma.variables.createVariable(name, collection.id, 'COLOR')
    }
    
    variable.setValueForMode(modeId, rgba)
  }
}

async function createDimensionTokens(type: string, values: Record<string, string>) {
  if (!values) return

  const collectionName = type
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName)
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName)
    collection.renameMode(collection.modes[0].modeId, 'Default')
  }
  const modeId = collection.modes[0].modeId

  for (const [name, valueStr] of Object.entries(values)) {
    const value = parseFloat(valueStr)
    if (isNaN(value)) continue

    let variable = figma.variables.getLocalVariables().find(v => v.name === name && v.variableCollectionId === collection!.id)
    if (!variable) {
      variable = figma.variables.createVariable(name, collection.id, 'FLOAT')
    }
    
    variable.setValueForMode(modeId, value)
  }
}

async function createTypographyTokens(typography: Record<string, any>) {
  if (!typography) return

  // Load fonts first
  const fontsToLoad: FontName[] = []
  
  // We need to know all fonts before we can create styles. 
  // The provided JSON structure has a global "fontFamilyPrimary" or per-style config?
  // Looking at sample: core.typography.fontFamilyPrimary = "Inter"
  // And individual styles have size, lineHeight, weight.
  
  const defaultFontFamily = typography.fontFamilyPrimary || 'Inter'

  for (const [name, style] of Object.entries(typography)) {
    if (typeof style !== 'object') continue // Skip "fontFamilyPrimary" string property

    const family = style.fontFamily || defaultFontFamily
    const weight = mapFontWeight(style.weight)
    fontsToLoad.push({ family, style: weight })
  }

  // Unique fonts
  const uniqueFonts = fontsToLoad.filter((v, i, a) => a.findIndex(t => t.family === v.family && t.style === v.style) === i)
  
  await Promise.all(uniqueFonts.map(font => figma.loadFontAsync(font).catch(e => console.warn(`Could not load font ${font.family} ${font.style}`, e))))

  for (const [name, style] of Object.entries(typography)) {
    if (typeof style !== 'object') continue

    const family = style.fontFamily || defaultFontFamily
    const weight = mapFontWeight(style.weight)
    
    let textStyle = figma.getLocalTextStyles().find(s => s.name === name)
    if (!textStyle) {
      textStyle = figma.createTextStyle()
      textStyle.name = name
    }

    try {
      textStyle.fontName = { family, style: weight }
      textStyle.fontSize = parseFloat(style.size)
      
      // Handle Line Height
      if (style.lineHeight) {
        const lh = parseFloat(style.lineHeight)
        // If small number (e.g. 1.5), it's percent/unitless. If large (e.g. 24), it's pixels.
        // Figma unitless is PERCENT with value * 100? No, unitless is tricky in Figma API. 
        // { unit: 'PERCENT', value: 150 } for 1.5.
        // { unit: 'PIXELS', value: 24 } for "24px".
        
        if (style.lineHeight.includes('px')) {
           textStyle.lineHeight = { unit: 'PIXELS', value: parseFloat(style.lineHeight) }
        } else {
           // Assume unitless multiplier
           textStyle.lineHeight = { unit: 'PERCENT', value: lh * 100 }
        }
      }
    } catch (e) {
      console.error(`Failed to set style for ${name}`, e)
    }
  }
}

function mapFontWeight(weight: number | string): string {
  const weights: Record<string, string> = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
    'normal': 'Regular',
    'bold': 'Bold'
  }
  return weights[String(weight)] || 'Regular'
}

function hexToRgba(hex: string): { r: number, g: number, b: number, a: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1
  } : null
}