(function() {
    if (!window.UI) window.UI = {};
    if (!UI.sections) UI.sections = {};

    UI.sections.cards = function() {
        const section = document.createElement('section');

        const title = 'Cards';
        const blurb = 'Cards are used to group related content and actions. They can contain a header, body, and footer, and can be configured with icons, actions, and other custom elements. The cards below are arranged in a responsive grid.';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const p = document.createElement('p');
        p.className = 'text-lg text-secondary';
        p.textContent = blurb;
        section.appendChild(p);

        const content = document.createElement('div');
        content.className = 'row';

        const h5 = document.createElement('h5');
        h5.textContent = 'Card Examples';
        h5.className = 'col-12';
        content.appendChild(h5);

        // Example Card 1: Basic
        const card1Col = document.createElement('div');
        card1Col.className = 'col-4';
        const card1 = UI.card({
            title: 'Basic Card',
            content: '<p>This is a basic card with a title and content.</p>'
        });
        card1Col.appendChild(card1);
        content.appendChild(card1Col);

        // Example Card 2: With Icon and Description
        const card2Col = document.createElement('div');
        card2Col.className = 'col-4';
        const card2 = UI.card({
            title: 'Card with Icon',
            content: '<p>This card includes an icon in the header and a description in the footer.</p>',
            icon: 'file-code',
            description: 'A simple description for the card.'
        });
        card2Col.appendChild(card2);
        content.appendChild(card2Col);

        // Example Card 3: With Actions and Footer
        const card3Col = document.createElement('div');
        card3Col.className = 'col-4';
        const card3 = UI.card({
            title: 'Card with Actions',
            content: '<p>This card demonstrates header actions and a custom footer.</p>',
            icon: 'settings',
            actions: [{
                icon: 'settings',
                onclick: () => console.log('Settings clicked!')
            }, {
                icon: 'trash-2',
                variant: 'error',
                onclick: () => console.log('Delete clicked!')
            }],
            footer: UI.button('Save Changes', {variant: 'primary', size: 'sm'})
        });
        card3Col.appendChild(card3);
        content.appendChild(card3Col);

        const panel = UI.panel('', content, { 
            icon: 'square',
            collapsible: false
        });
        
        section.appendChild(panel);
        
        return section;
    };
})(); 