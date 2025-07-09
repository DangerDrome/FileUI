(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.colors = function() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="callout callout-info">
                <i data-lucide="info" class="icon"></i>
                <p>The color system is designed to be systematic and semantic. It includes a palette for semantic states (primary, success, warning, error), a background hierarchy for layering UI elements, and a set of text colors for readability.</p>
            </div>
            <h5>Semantic Colors</h5>
            <div id="semantic-colors-container"></div>
            
            <h5>Base Background Hierarchy</h5>
            <div class="row" id="bg-hierarchy-container"></div>

            <h5>Text Colors</h5>
            <div class="row" id="text-colors-container"></div>
        `;

        const semanticColorsData = [
            { name: 'Primary', base: 'primary' },
            { name: 'Success', base: 'success' },
            { name: 'Warning', base: 'warning' },
            { name: 'Error', base: 'error' },
            { name: 'Info', base: 'info' },
            { name: 'Neutral', base: 'neutral' },
        ];

        const bgHierarchy = [
            { name: 'Layer 0', var: '--bg-layer-0', textVar: '--text-primary' },
            { name: 'Layer 1', var: '--bg-layer-1', textVar: '--text-primary' },
            { name: 'Layer 2', var: '--bg-layer-2', textVar: '--text-primary' },
            { name: 'Layer 3', var: '--bg-layer-3', textVar: '--text-primary' },
            { name: 'Layer 4', var: '--bg-layer-4', textVar: '--text-primary' },
        ];

        const textColors = [
            { name: 'Primary', var: '--text-primary' },
            { name: 'Secondary', var: '--text-secondary' },
            { name: 'Tertiary', var: '--text-tertiary' },
            { name: 'Quaternary', var: '--text-quaternary' },
            { name: 'Disabled', var: '--text-disabled' },
            { name: 'Placeholder', var: '--text-placeholder' },
        ];

        function rgbToHex(rgb) {
            if (!rgb || !rgb.includes('rgb')) return '#000000';
            let [r, g, b] = rgb.match(/\d+/g).map(Number);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        function createChip(colorData) {
            const chip = document.createElement('div');
            chip.className = 'color-chip';
            chip.style.backgroundColor = `var(${colorData.var})`;
            
            // If textVar is provided, use it. Otherwise, calculate contrast.
            if (colorData.textVar) {
                chip.style.color = `var(${colorData.textVar})`;
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'color-chip-name';
            nameSpan.textContent = colorData.name;
            
            const hexSpan = document.createElement('span');
            hexSpan.className = 'color-chip-hex';
            hexSpan.textContent = '...'; // Placeholder
            
            chip.appendChild(nameSpan);
            chip.appendChild(hexSpan);

            // Defer getting computed style until element is in DOM
            requestAnimationFrame(() => {
                const computedBgColor = getComputedStyle(chip).backgroundColor;
                
                // Only calculate contrast for chips that don't have an explicit text color
                if (!colorData.textVar) {
                    const [r, g, b] = computedBgColor.match(/\d+/g).map(Number);
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                    chip.style.color = luminance > 128 ? 'var(--grey-900)' : 'var(--grey-100)';
                }

                const hex = rgbToHex(computedBgColor);
                hexSpan.textContent = hex;
                chip.onclick = () => {
                    navigator.clipboard.writeText(hex);
                    UI.toast(`Copied ${hex} to clipboard`, 'success');
                };
            });
            
            return chip;
        }

        function createChipRow(container, chipData) {
            chipData.forEach(color => {
                const col = document.createElement('div');
                col.className = 'col';
                col.appendChild(createChip(color));
                container.appendChild(col);
            });
        }
        
        const semanticContainer = content.querySelector('#semantic-colors-container');
        semanticColorsData.forEach(color => {
            const sectionWrapper = document.createElement('div');
            sectionWrapper.className = 'semantic-color-section';
            
            const title = document.createElement('h6');
            title.textContent = color.name;
            sectionWrapper.appendChild(title);

            const mainChipsRow = document.createElement('div');
            mainChipsRow.className = 'row';
            
            const col1 = document.createElement('div');
            col1.className = 'col';
            col1.appendChild(createChip({ 
                name: color.name, 
                var: `--${color.base}`, 
                textVar: `--${color.base}-dark` 
            }));
            mainChipsRow.appendChild(col1);

            const col2 = document.createElement('div');
            col2.className = 'col';
            col2.appendChild(createChip({ 
                name: `${color.name} Dark`, 
                var: `--${color.base}-dark`, 
                textVar: `--${color.base}` 
            }));
            mainChipsRow.appendChild(col2);
            sectionWrapper.appendChild(mainChipsRow);

            const tintedRow = document.createElement('div');
            tintedRow.className = 'row';
            tintedRow.dataset.tint = color.base;
            
            for (let i = 0; i <= 4; i++) {
                const col = document.createElement('div');
                col.className = 'col';
                tintedRow.appendChild(col);
                col.appendChild(createChip({
                    name: `Layer ${i}`,
                    var: `--bg-layer-${i}`,
                    textVar: 'var(--text-primary)'
                }));
            }
            sectionWrapper.appendChild(tintedRow);
            
            semanticContainer.appendChild(sectionWrapper);
        });
        
        createChipRow(content.querySelector('#bg-hierarchy-container'), bgHierarchy);
        createChipRow(content.querySelector('#text-colors-container'), textColors);

        return UI.panel('Colors', content, { 
            icon: 'palette',
            collapsible: true,
            startCollapsed: false
        });
    };
})(); 