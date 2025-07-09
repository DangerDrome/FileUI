(function() {
    'use strict';

    const createGridSection = () => {
        const section = document.createElement('section');

        const title = 'Grid System';
        const blurb = 'A simple, 12-column responsive flexbox grid system. Columns will stack on screens smaller than 768px.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);
        
        const content = document.createElement('div');
        content.classList.add('grid-demo');

        const demoContent = document.createElement('div');
        demoContent.innerHTML = `
            <h5>Equal-width Columns</h5>
            <div class="row">
                <div class="col">1 of 2</div>
                <div class="col">1 of 2</div>
            </div>
            <div class="row">
                <div class="col">1 of 3</div>
                <div class="col">1 of 3</div>
                <div class="col">1 of 3</div>
            </div>

            <h5>Sized Columns</h5>
            <div class="row">
                <div class="col-8">col-8</div>
                <div class="col-4">col-4</div>
            </div>
            <div class="row">
                <div class="col-4">col-4</div>
                <div class="col-4">col-4</div>
                <div class="col-4">col-4</div>
            </div>
            <div class="row">
                <div class="col-6">col-6</div>
                <div class="col-6">col-6</div>
            </div>

            <h5>Nested Grid</h5>
            <div class="row">
                <div class="col-9">
                    col-9
                    <div class="row" style="margin-top: 1rem;">
                        <div class="col-6">Nested col-6</div>
                        <div class="col-6">Nested col-6</div>
                    </div>
                </div>
                <div class="col-3">col-3</div>
            </div>
        `;
        content.appendChild(demoContent);
        
        const panel = UI.panel('', content, {
            icon: 'layout-grid',
            collapsible: false
        });

        section.appendChild(panel);

        return section;
    };

    // Expose the function to the global scope
    window.UI = window.UI || {};
    window.UI.sections = window.UI.sections || {};
    window.UI.sections.grid = createGridSection;

})(); 