const DEFAULT_STATE = {
    // view options
    stackColumns: 2,
    cardColumns: 2,

    // tagging
    tag_cache: {},

    selectedStacks: [],
    selectedCards: [],

    current_stack_display_order: [],

    cards: {},
    stacks: {},
    stack_order: [],
    newStackName: '',
    newCardNames: {},
    focusedStackIds: [],
    focusedCardIds: [],
    skip_ask_before_delete: false,

    showPopup: false,
}

function setupStore(){

    const store = Vuex.createStore({
        state() { return DEFAULT_STATE; },
        mutations: {
            setShowPopup(s, showPopup) {
                s.showPopup = showPopup;
            },
            addStack(s, { name, forceId, tags, collapsed, closed }) {
                const id = forceId ?? Date.now();
                s.stacks[id.toString()] = new Stack({
                    id,
                    name,
                    cards: {},
                    card_order: [],
                    collapsed: collapsed ?? false,
                    closed: closed ?? false,
                    tags: tags ?? [],
                    passing: -1 // pending by default
                });
                s.stack_order.push(id.toString());
                setTimeout(() => {
                    document.querySelector(`.newCardNameInput-${id}`)?.focus();
                }, 100);
            },
            updateTagCache(s, { tags }) {
                // update our set of s.tag_cache to include passed in tags
                tags.forEach(tag => {
                    if (!s.tag_cache[tag]) {
                        s.tag_cache[tag] = 1;
                    }
                    else {
                        s.tag_cache[tag]++;
                    }
                });
            },
            deselectAllStacks(s){
                s.selectedStacks.forEach(stackId => {
                    s.stacks[stackId.toString()].selected = false;
                });
                s.selectedStacks = [];
            },
            setStackSelected(s, {stackId, status}){
                if(status){
                    s.selectedStacks.push(stackId.toString());
                    s.stacks[stackId.toString()].selected = true;
                }else{
                    s.selectedStacks.splice(s.selectedStacks.indexOf(stackId.toString()), 1);
                    s.stacks[stackId.toString()].selected = false;
                }
            },
            toggleSelectedStackCollapsed(s){
                // loop through selected stacks and toggle collapsed
                s.selectedStacks.forEach(stackId => {
                    s.stacks[stackId.toString()].collapsed = !s.stacks[stackId.toString()].collapsed;
                })
            },
            toggleStackSelected(s, stackId) {
                if (s.selectedStacks.includes(stackId.toString())) {
                    s.selectedStacks.splice(s.selectedStacks.indexOf(stackId.toString()), 1);
                }
                else {
                    s.selectedStacks.push(stackId.toString());
                }
                s.stacks[stackId.toString()].selected = !s.stacks[stackId.toString()].selected;
            },
            stackAddTags(s, { stackId, tags }) {
                s.stacks[stackId].tags = [...new Set([...s.stacks[stackId].tags, ...tags])];
            },
            stackRemoveTags(s, { stackId, tags }) {
                s.stacks[stackId].tags = s.stacks[stackId].tags.filter(t => !tags.includes(t));
            },
            setStackClosed(s, { stackId, closed }) {
                s.stacks[stackId.toString()].closed = closed;
            },
            setStackColumns(s, count) {
                s.stackColumns = count
            },
            setCardColumns(s, count) {
                s.cardColumns = count
            },
            setStackFocused(s, { stackId, focused }) {
                s.stacks[stackId.toString()].focused = focused;
            },
            deleteStackSilent(s, id) {
                delete s.stacks[id.toString()];
                // remove from stack_order
                s.stack_order.splice(s.stack_order.indexOf(id.toString()), 1);
            },
            deleteStack(s, id) {
                if (window.confirm('Are you sure you want to delete stack \n\n' + s.stacks[id.toString()].name)) {
                    delete s.stacks[id.toString()];
                    // remove from stack_order
                    s.stack_order.splice(s.stack_order.indexOf(id.toString()), 1);
                }
            },
            addCard(s, { stackId, content }) {
                const card = new Card({
                    id: `${Date.now()}`,
                    content,
                    editing: false,
                    stackId,
                    position: s.stacks[stackId].cards.length,
                    selected: false,
                    passing: -1, // default to pending status
                    tags: []
                });
    
                s.stacks[stackId.toString()].cards[card.id] = card;
                s.stacks[stackId.toString()].card_order.push(card.id);
    
                s.newCardNames[stackId.toString()] = '';
            },
            addFeatureCard(s, { stackId, content }) {
                const card = new FeatureCard({
                    id: `${Date.now()}`,
                    content,
                    editing: false,
                    stackId,
                    position: s.stacks[stackId].cards.length,
                    selected: false,
                    passing: -1, // default to pending status
                    tags: [TAG_CARD_IS_FEATURE]
                })

                s.stacks[stackId.toString()].cards[card.id] = card;
                s.stacks[stackId.toString()].card_order.push(card.id);
            },
            addSubstackAsCard(s, { parentStackId, childStackId }) {
                // add the child stack as a card to the parent stack
                const card = {
                    id: Date.now(),
                    content: s.stacks[childStackId].name,
                    editing: false,
                    stackId: parentStackId,
                    referenceStackId: childStackId,
                    position: s.stacks[parentStackId].cards.length,
                    selected: false,
                    passing: -1, // default to pending status
                    // flag as substack for special rendering
                    tags: [TAG_CARD_IS_STACK]
                };
                s.stacks[parentStackId.toString()].cards[card.id] = card;
                s.stacks[parentStackId.toString()].card_order.push(card.id);
            },
            setCardFocused(s, { card, focused }) {
                s.stacks[card.stackId].cards[card.id].focused = focused;
            },
            setCardCompleted(s, { card, state }) {
                console.log('setCardCompleted', { card, state })
    
                s.stacks[card.stackId.toString()].cards[card.id.toString()].completed_at = state ? Date.now() : null;
                console.log('set CompletedAt to:', s.stacks[card.stackId.toString()].cards[card.id.toString()].completed_at)
            },
            setCardPassingStatus(s, { card, passing }) {
                // we should be passing in an index to the stack card array here :G
                //card.passing = passing;
                if (!s.stacks[card.stackId.toString()]) {
                    console.error('no stack for card?', { card, stack_ids: Object.keys(s.stacks) });
                    throw new Error("stack not found for card")
                }
                s.stacks[card.stackId].cards[card.id].passing = passing;
                // bust cache of stack card status counts
                s.stacks[card.stackId].flagDirty();
            },
            setCardError(s, { card, error }) {
                s.stacks[card.stackId].cards[card.id].error = error;
            },
            deleteCard(s, { stackId, cardID }) {
                if (s.skip_ask_before_delete || confirm('Are you sure?!')) {
                    delete s.stacks[stackId.toString()].cards[cardID.toString()]
                    // remove from card_order array
                    s.stacks[stackId.toString()].card_order.splice(s.stacks[stackId.toString()].card_order.indexOf(cardID), 1);
                    s.stacks[stackId.toString()].flagDirty();
                }
            },
            toggleCollapse(s, id) {
                // console.warn('toggleCollapse before:', {
                //     id,
                //     collapsed: s.stacks[id.toString()]?.collapsed
                // })
                s.stacks[id.toString()].collapsed = !s.stacks[id.toString()].collapsed;
                // console.warn('>>> toggleCollapse after:', {
                //     id,
                //     collapsed: s.stacks[id.toString()]?.collapsed
                // })
            },
            collapseAll(s) {
                for (let key of Object.keys(s.stacks)) {
                    s.stacks[key].collapsed = true;
                }
            },
            expandAll(s) {
                for (let key of Object.keys(s.stacks)) {
                    s.stacks[key].collapsed = false;
                }
            },
            moveCard(s, { fromStackId, toStackId, cardId }) {
                const cardIndex = s.stacks[fromStackId].card_order.findIndex(c => c.id === cardId);
                if (cardIndex > -1) {
                    const [card] = s.stacks[fromStackId].card_order.splice(cardIndex, 1);
                    s.stacks[toStackId].card_order.push(card);
                }
            },
            setCardSelected(s, { card, status }) {
                const stack = s.stacks[card.stackId.toString()];
                if (!stack) {
                    throw new Error("stack not found for card " + `c:${card.id} s:${card.stackId}`)
                }
                Object.values(stack.cards).forEach(c => {
                    // console.warn('c',{
                    //     c,
                    //     cardId: card.id,
                    //     cId: c.id,
                    // });
                    if(!stack.cards[c.id.toString()]){
                        console.warn('card not in stack?', { card, stack_ids: Object.keys(s.stacks) });
                        throw new Error("stack not found for card")
                    }
                    stack.cards[c.id.toString()].selected = status && c.id === card.id
                });
            },
            setCardPosition(s, { card, position }) {
                const stack = s.stacks[card.stackId.toString()];
                if (!stack) {
                    throw new Error("stack not found for card " + `c:${card.id} s:${card.stackId}`)
                }
                // find the card in the stack
                const cardIndex = stack.card_order.findIndex(cid => cid.toString() === card.id.toString());
                if (cardIndex === -1) {
                    throw new Error("card not found in stack " + `c:${card.id} s:${card.stackId}`)
                }
                // remove the card from the stack
                stack.card_order.splice(cardIndex, 1);
                // insert the card at the new position
                stack.card_order.splice(position, 0, card.id);
                // renormalize the positions
                stack.card_order.forEach((c, i) => stack.cards[c.toString()].position = i);
            },
            setCardEditing(s, { stackId, cardId, value }) { console.warn(arguments); const card = s.stacks[stackId].cards[cardId]; if (card) { card.editing = value; } },
            setCardContent(s, { stackId, cardId, content }) { const card = s.stacks[stackId].cards.find(c => c.id === cardId); if (card) card.content = content; },
            setNewStackName(s, newName) { s.newStackName = newName; },
            setNewCardName(s, { stackId, newName }) { s.newCardNames[stackId.toString()] = newName; },
        },
        actions: {
            toggleEditCard(context, card) {
                context.commit('setCardEditing', { stackId: card.stackId, cardId: card.id, value: !card.editing });
            },
            toggleCardSelected(context, {card}) {

                if (!card) {
                    console.warn('card no longer exists', { event, context });
                    // we might've just repsonded to a Delete button click and the card is gone
                    return;
                }
                //console.warn('selected',{card});
                context.commit('setCardSelected', { card, status: !card.selected });
            },
            saveStateToLocalStorage() {
                localStorage.setItem('state', JSON.stringify(this.state));
            },
            loadStateFromLocalStorage() {
                const state = localStorage.getItem('state');
                if (state) this.replaceState({ ...DEFAULT_STATE, ...JSON.parse(state) });
    
                if (!this.state.stack_order) { this.state.stack_order = []; }
    
                // verify cards have .stackId defined
                for (let id in this.state.stacks) {
                    let s = this.state.stacks[id.toString()];
                    // legacy fix, if s.cards is an array,
                    // convert to an object keyed by card.id
                    if (Array.isArray(s.cards)) {
                        const cards = {};
                        s.cards.forEach(c => cards[c.id] = c);
                        s.cards = cards;
                    }
                    //s.cards.forEach(c => c.stackId = id.toString());
                    s.card_order = s.card_order ?? s.cards.map(c => c.id);
                }
    
                // make sure each dehydrated stack object turns into a hydrated Stack class instance
                for (let id in this.state.stacks) {
                    this.state.stacks[id.toString()] = new Stack(this.state.stacks[id.toString()]);
                    this.state.stacks[id.toString()].tags = this.state.stacks[id.toString()].tags ?? [];
    
    
                    // make sure each card has a .tags array
                    for (let cardId in this.state.stacks[id.toString()].cards) {
                        const card = this.state.stacks[id.toString()].cards[cardId];
                        card.tags = card.tags ?? [];
                    }
    
                    // make sure there's an entry in the .stack.card_order for all cards
                    // (see if any cards are missing from the card_order array and add them)
                    const cardIds = Object.keys(this.state.stacks[id.toString()].cards);
                    cardIds.forEach(cardId => {
                        if (!this.state.stacks[id.toString()].card_order.includes(cardId)) {
                            this.state.stacks[id.toString()].card_order.push(cardId);
                        }
                    });
    
                    // make sure card positions match the .stack.card_order index
                    let orphanedCardIds = [];
                    this.state.stacks[id.toString()].card_order.forEach((cardId, index) => {
                        // if the card isn't present, flag it for removal from the card_order array
                        if (!this.state.stacks[id.toString()].cards[cardId]) {
                            orphanedCardIds.push(cardId);
                        }
                        else {
                            // set the card position to match the index in the card_order array
                            this.state.stacks[id.toString()].cards[cardId].position = index;
                        }
                    });
                    // clean up orphans
                    this.state.stacks[id.toString()].card_order = this.state.stacks[id.toString()].card_order.filter(cardId => !orphanedCardIds.includes(cardId));
                }
    
                if (!window.bootSystem) {
                    console.warn('bootSystem not found, skipping boot');
                    return;
                }
                // boot system
                window.bootSystem();
                // hide loading div
                document.querySelector('.loading').style.display = 'none';
                // show #app div
                document.querySelector('#app').style.display = '';
            },
            deleteStackSilent(context, stackId) {
                context.commit('deleteStackSilent', stackId);
            }
        }
    });
    
    // save to local storage on every mutation
    store.subscribe((mutation, state) => {
        store.dispatch('saveStateToLocalStorage');
    
        // console.warn('mut', mutation.type);//{mutation, state})
    
        switch (mutation.type) {
            case 'addStack':
            case 'addCard':
            case 'stackAddTags':
            case 'cardAddTags':
                // update tag_cache with any new tags
                store.commit('updateTagCache', { tags: mutation.payload?.tags ?? [] });
                break;
        }
    
        if (mutation.type === 'addCard') {
            const { stackId } = mutation.payload;
            //console.log('addCardPayload', { payload: mutation.payload })
            state.newCardNames[stackId + ''] = '';
            // the text input isn't updating to reflect the model change
            // let's force it empty..
    
        }
    });

    // expose
    window.store = store
}

(async()=>{
    // wait for window.Vuex to be defined
    while(!window.createStore){
        console.warn('waiting for window.createStore')
        await new Promise(r => setTimeout(r, 100))
    }
    setupStore()
})()