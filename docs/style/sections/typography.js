(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.typography = function() {
        const content = document.createElement('div');
        content.innerHTML = `
            <h5><span class="tag tag-accent tag-lg">Inter Font Specimen</span></h5>
            <div class="font-specimen">
                <div class="font-specimen-header">
                    <h2 class="font-specimen-title">Inter</h2>
                    <div class="font-specimen-controls">
                        <input type="range" id="font-size-slider" min="8" max="120" value="48" class="form-control font-size-slider">
                        <span id="font-size-display" class="font-size-display">48px</span>
                    </div>
                </div>
                
                <div class="font-specimen-preview">
                    <div class="font-preview-editable" contenteditable="true" id="font-preview">
                        Almost before we knew it, we had left the ground.
                    </div>
                </div>
                
                <div class="font-specimen-weights">
                    <div class="font-weight-item">
                        <div class="font-weight-label">Light 300</div>
                        <div class="font-weight-sample" style="font-weight: 300;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div class="font-weight-item">
                        <div class="font-weight-label">Regular 400</div>
                        <div class="font-weight-sample" style="font-weight: 400;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div class="font-weight-item">
                        <div class="font-weight-label">Medium 500</div>
                        <div class="font-weight-sample" style="font-weight: 500;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div class="font-weight-item">
                        <div class="font-weight-label">Semibold 600</div>
                        <div class="font-weight-sample" style="font-weight: 600;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div class="font-weight-item">
                        <div class="font-weight-label">Bold 700</div>
                        <div class="font-weight-sample" style="font-weight: 700;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div class="font-weight-item">
                        <div class="font-weight-label">ExtraBold 800</div>
                        <div class="font-weight-sample" style="font-weight: 800;">The quick brown fox jumps over the lazy dog</div>
                    </div>
                </div>
            </div>

            <h5>Headings</h5>
            <h1 class="text-primary">H1: The quick brown fox</h1>
            <h2 class="text-secondary">H2: The quick brown fox</h2>
            <h3 class="text-tertiary">H3: The quick brown fox</h3>
            <h4 class="text-tertiary">H4: The quick brown fox</h4>
            <h5 class="text-tertiary">H5: The quick brown fox</h5>
            <h6 class="text-placeholder">H6: The quick brown fox</h6>

            <h5>Paragraphs</h5>
            <p>This is a standard paragraph. It's used for the main body of text. The quick brown fox jumps over the lazy dog. A sentence or two about the purpose of this element. The line height and spacing are designed for optimal readability.</p>
            <p class="lead">This is a lead paragraph. It's slightly larger and has more line spacing, used for introductions or important stand-out text. The quick brown fox jumps over the lazy dog.</p>
            <p class="small">This is a small paragraph. It's useful for captions, disclaimers, or less important text. The quick brown fox jumps over the lazy dog.</p>

            <h5>Inline Elements</h5>
            <div class="row" style="align-items: center; gap: var(--space-4) 0;">
                <div class="col-auto"><a href="javascript:void(0);">This is a link</a></div>
                <div class="col-auto"><code>This is code</code></div>
                <div class="col-auto"><mark>This is marked text</mark></div>
                <div class="col-auto"><kbd>Ctrl</kbd>+<kbd>C</kbd></div>
                <div class="col-auto"><abbr title="Abbreviation">Abbr.</abbr></div>
                <div class="col-auto"><del>Deleted text</del></div>
                <div class="col-auto"><ins>Inserted text</ins></div>
                <div class="col-auto"><var>variable</var></div>
                <div class="col-auto"><samp>Sample output</samp></div>
                <div class="col-auto"><cite>Citation</cite></div>
                <div class="col-auto"><q>This is a quote</q></div>
            </div>

            <h5>Block Elements</h5>
            <blockquote>
                <p>This is a blockquote. It's used for quoting text from another source. It provides visual distinction from the surrounding content.</p>
                <footer>— Source Name</footer>
            </blockquote>

<pre><code>// This is a preformatted code block.
function greet(name) {
    return \`Hello, \${name}!\`;
}
</code></pre>

            <h5>Lists</h5>
            <div class="row">
                <div class="col-6">
                    <h6>Unordered List</h6>
                    <ul>
                        <li>List item one</li>
                        <li>List item two
                            <ul>
                                <li>Nested item one</li>
                                <li>Nested item two</li>
                            </ul>
                        </li>
                        <li>List item three</li>
                    </ul>
                </div>
                <div class="col-6">
                    <h6>Ordered List</h6>
                    <ol>
                        <li>First item</li>
                        <li>Second item</li>
                        <li>Third item</li>
                    </ol>
                </div>
            </div>

            <h5>Tables</h5>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>Jane Doe</td>
                        <td>Administrator</td>
                        <td><span class="tag tag-success">Active</span></td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>John Smith</td>
                        <td>Developer</td>
                        <td><span class="tag tag-neutral">Inactive</span></td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>Sam Wilson</td>
                        <td>Designer</td>
                        <td><span class="tag tag-warning">Pending</span></td>
                    </tr>
                </tbody>
            </table>

            <h5>Horizontal Rule</h5>
            <hr>

            <h5>Callouts</h5>
            <div class="callout callout-info">
                <i data-lucide="info" class="icon"></i>
                <p><strong>Heads up!</strong> This is an informational callout that you can use to highlight important information.</p>
            </div>
            <div class="callout callout-success">
                <i data-lucide="check-circle" class="icon"></i>
                <p><strong>Success!</strong> This is a success callout to indicate that an operation was completed successfully.</p>
            </div>
            <div class="callout callout-warning">
                <i data-lucide="alert-triangle" class="icon"></i>
                <p><strong>Warning!</strong> This is a warning callout to alert users to potential issues or to proceed with caution.</p>
            </div>
            <div class="callout callout-error">
                <i data-lucide="x-circle" class="icon"></i>
                <p><strong>Danger!</strong> This is an error callout to inform users that something has gone wrong.</p>
            </div>
        `;

        const panel = UI.panel('Typography', content, { 
            icon: 'type',
            collapsible: true,
            startCollapsed: false
        });

        // Add interactivity for the font slider
        const slider = panel.querySelector('#font-size-slider');
        const display = panel.querySelector('#font-size-display');
        const preview = panel.querySelector('#font-preview');
        
        if (slider && display && preview) {
            slider.addEventListener('input', () => {
                const size = slider.value;
                display.textContent = `${size}px`;
                preview.style.fontSize = `${size}px`;
            });
        }

        UI.icons();
        
        return panel;
    };
})(); 