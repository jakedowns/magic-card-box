const TAG_HIDE_COMPLETE_TOGGLE = 100;
const TAG_TEST_STACK = 101;
const TAG_TEST_CARD = 102;
const TAG_CARD_IS_STACK = 103;

const TAG_CARD_IS_FEATURE = 200;

const TAG_NAME_MAP = {
    TAG_HIDE_COMPLETE_TOGGLE: 'Hide Complete Toggle',
    TAG_TEST_STACK: 'Test Stack',
    TAG_TEST_CARD: 'Test Card',
    TAG_CARD_IS_STACK: 'Card is Stack',

    TAG_CARD_IS_FEATURE: 'Card is Feature',
}
const hasAncestorWithClass = (element, className) => {
    return element.closest(`.${className}`) !== null;
};
class Stack {
    constructor({
        id,
        name,
        cards,
        card_order,
        collapsed,
        closed,
        tags,
        passing,
        bgColor
    }) {
        this.id = id;
        this.name = name;
        this.cards = cards;
        this.card_order = card_order;
        this.collapsed = collapsed ?? false;
        this.closed = closed ?? false;
        this.tags = tags ?? [];
        this.dirty = true; // Initialize dirty flag to true
        this.statusCountsCache = null; // Initialize cache to null
        this._passing = passing ?? -1; // default to pending status
        this.bgColor = bgColor ?? null;
    }

    flagDirty() {
        this.dirty = true;
    }

    // see: passFailPendingString 
    get statusCounts() {
        if (this.dirty || this.statusCountsCache === null) {
            let countPassing = 0;
            let countFailing = 0;
            let countPending = 0;
            let countErrors = 0;
            for (let id in this.cards) {
                const card = this.cards[id];

                if (card.passing === true) { countPassing++; }
                else if (card.passing === false) { countFailing++; }
                else if (card.passing === -1) { countPending++; }

                if (card.error) { countErrors++; }
            }
            this.statusCountsCache = {
                countPassing,
                countFailing,
                countPending,
                countErrors
            };
            this.dirty = false; // Reset dirty flag
        }
        return this.statusCountsCache;
    }

    get passing() {
        // Compute the 'passing' value based on the children
        // Iterate over the children and check if they're passing
        // Return the computed value
        let foundPending = false;
        // find the first passing === false
        let foundFailing = false;
        if (!this.card_order.length) {
            // use internal flag
            return this._passing;
        }
        for (let id in this.cards) {
            const card = this.cards[id];
            if (card.passing === -1 && !card.completed_at) {
                foundPending = true;
            }
            else if (card.passing === false) {
                foundFailing = true;
                break;
            }
        }
        return foundFailing ? false : foundPending ? -1 : true;
    }
}
const { createStore } = Vuex;
window.createStore = createStore;

class Card {
    constructor({
        id,
        content,
        editing,
        stackId,
        position,
        selected,
        passing,
        tags,
    }){
        this.name = name
        this.position = position
        this.editing = editing ?? false
        this.selected = selected ?? false
        this.passing = passing ?? -1
        this.tags = tags ?? []
        this.stackId = stackId
        this.id = id
        this.content = content
    }
}

class Feature extends Card {
    constructor({name, position}){
        super(arguments[0])
        this.scenarios = []
    }
}

class Scenario {
    constructor(){
        this.steps = []
    }

    addStep(step){
        this.steps.push(step)
    }
}

class Step {
    constructor({type, name}){
        this.type = type
        this.name = name
    }
}

const app = Vue.createApp({
    setup() {
        // Access the store instance with the `useStore` hook
        const store = Vuex.useStore();
        const { computed, ref, reactive,
            watch, onMounted, onBeforeUnmount } = Vue;
        const stacks = computed(() => store.state.stacks);
        const newCardNames = computed(() => store.state.newCardNames);
        const showPopup = computed(() => store.state.showPopup);
        const selectedStacks = computed(() => store.state.selectedStacks);
        const dragging = ref({ cardId: null, fromStackId: null });
        const draggingStack = ref(null);
        const newStackNameInput = ref(null);
        const newStackName = ref('');
        const contextMenuContext = ref(null);
        const selectedStackToMerge = ref(null);

        const passFailPendingString = computed(() => {
            return (stack) => {
                const counts = stack.statusCounts;
                if (!counts) {
                    return '';
                }
                return `pass: ${counts.countPassing} | fail: ${counts.countFailing} | pending: ${counts.countPending} | err: ${counts.countErrors}`;
            }
        })

        function dragStart(card, stackId) {
            dragging.value = { card, fromStackId: stackId };
        }

        function drop(onCard) {
            if (dragging.value.cardId !== null) {
                console.warn('drop', {
                    dragging: JSON.parse(JSON.stringify(dragging.value)),
                    onCard: JSON.parse(JSON.stringify(onCard)),
                    fromPosition: dragging.value.card.position,
                    toPosition: onCard.position
                })
                // if we changed stacks, update the card's stackId
                const fromStackId = dragging.value.fromStackId;
                if (fromStackId !== onCard.stackId) {
                    store.commit('moveCard', {
                        fromStackId,
                        toStackId: onCard.stackId,
                        cardId: dragging.value.card.id
                    });
                }
                // set the card's position within the stack
                store.commit('setCardPosition', {
                    card: {
                        id: dragging.value.card.id,
                        stackId: onCard.stackId
                    },
                    position: onCard.position - 1
                });
                // clear the dragging state
                dragging.value = { card: null, fromStackId: null };
            }
        }

        // Create computed properties for each piece of state you want to map
        // Computed property for stackColumns with getter and setter
        const stackColumnsInput = computed({
            get: () => store.state.stackColumns,
            set: (value) => store.commit('setStackColumns', Number(value))
        });

        // Computed property for cardColumns with getter and setter
        const cardColumnsInput = computed({
            get: () => store.state.cardColumns,
            set: (value) => store.commit('setCardColumns', Number(value))
        });

        const showContextMenu = ref(false);
        const menuPosition = ref({ x: 0, y: 0 });
        let touchStartTimer = null;
        const contextMenu = ref(null);

        const openContextMenu = (event) => {

            contextMenuContext.value = null;
            // if we clicked on or within a .card class element, we want to show the card context menu
            if (event.target.classList.contains('card') || hasAncestorWithClass(event.target, 'card')) {
                // get the card id from the data-card-id attribute
                const cardId = event.target.dataset.cardId;
                // flag the card as selected
                store.commit('setCardSelected', { card: { id: cardId, stackId: event.target.dataset.stackId }, status: true });
                contextMenuContext.value = 'card';
            }else if(event.target.classList.contains('stack') || hasAncestorWithClass(event.target, 'stack')){
                // get the stack id from the data-stack-id attribute
                const closestStack = event.target.classList.contains('stack') ? event.target : event.target.closest('.stack');
                const stackId = closestStack.dataset.stackId;
                // flag the stack as selected
                store.commit('setStackSelected', {stackId, status: true})
                contextMenuContext.value = 'stack';
            }

            event.preventDefault();
            showContextMenu.value = true;
            menuPosition.value = { x: event.clientX, y: event.clientY };
            contextMenu.value.style.display = 'block';
        };
        

        const handleTouchStart = (event) => {
            event.preventDefault();
            touchStartTimer = setTimeout(() => {
                showContextMenu.value = true;
                const touch = event.touches[0];
                menuPosition.value = { x: touch.clientX, y: touch.clientY };
                contextMenu.value.style.display = 'block';
            }, 500); // 500 ms for long-press
        };

        const handleTouchEnd = () => {
            clearTimeout(touchStartTimer);
        };

        const deleteSelectedStacks = () => {
            store.commit('deleteSelectedStacks');
        }

        const selectMenuItem = (action) => {
            console.log('selectMenuItem selected action:', action);
            // THIS COULD BE A MAP DATA STRUCTURE
            switch(action){
                case 'toggleSelectedStackCollapsed':
                    store.commit('toggleSelectedStackCollapsed');
                    break;
                case 'mergeSelectedStack':
                    store.commit('setShowPopup',true);
                    break;
                case 'closeSelectedStack':
                    selectedStacks.value.forEach((stackId) => {
                        store.commit('setStackClosed', {stackId, closed: true});
                        // de-select the stack
                        store.commit('setStackSelected', {stackId, status: false});
                    });
                    break;
                case 'closeAllStacks':
                    closeAllStacks();
                    break;
                case 'openAllStacks':
                    openAllStacks();
                    break;
                case 'collapseAllStacks':
                    collapseAll();
                    break;
                case 'expandAllStacks':
                    expandAll();
                    break;
                case 'deleteSelectedStacks':
                    deleteSelectedStacks();
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
                    break;
            }
            // hide the context menu
            showContextMenu.value = false;
            contextMenu.value.style.display = 'none';
        };

        const closeContextMenu = (event) => {
            if (showContextMenu.value && (!contextMenu.value || !contextMenu.value.contains(event.target))) {
                showContextMenu.value = false;
                contextMenu.value.style.display = 'none';
            }
        };

        onMounted(async () => {
            // don't execute this until window.bootSystem is defined
            while (typeof window.bootSystem === 'undefined') {
                console.warn('waiting for window.bootSystem to be defined');
                // wait 1 second
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            store.dispatch('loadStateFromLocalStorage');
            newStackNameInput.value.focus();

            window.addEventListener('click', closeContextMenu);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('click', closeContextMenu);
        });

        /* Vue 3 Composition API Mutation Mappings */

        const deleteStack = (stackId) => {
            store.commit('deleteStack', stackId);
        }
        const deleteStacksWithTags = (tags, maxDepth = 1) => {
            // find all stacks with tags
            const stacks = Object.values(store.state.stacks).filter(s => s.tags.includes(tags));
            // delete each stack
            stacks.forEach(s => store.commit('deleteStack', s.id));
        }
        const addCard = (payload) => {
            store.commit('addCard', payload);
        }
        const deleteCard = (payload) => {
            store.commit('deleteCard', payload);
        }

        const toggleCollapse = (stackId) => {
            store.commit('toggleCollapse', stackId);
        }
        const collapseAll = () => {
            store.commit('collapseAll');
        }
        const expandAll = () => {
            store.commit('expandAll');
        }
        const moveCard = (payload) => {
            store.commit('moveCard', payload);
        }

        const setCardEditing = (payload) => {
            store.commit('setCardEditing', payload);
        }
        const setCardContent = (payload) => {
            store.commit('setCardContent', payload);
        }
        const setNewStackName = (payload) => {
            store.commit('setNewStackName', payload);
        }
        const setNewCardName = (payload) => {
            store.commit('setNewCardName', payload);
        }

        const setCardSelected = (payload) => {
            store.commit('setCardSelected', payload);
        }
        const setCardCompleted = (payload) => {
            store.commit('setCardCompleted', payload);
        }
        const setStackClosed = (payload) => {
            store.commit('setStackClosed', payload);
        }

        const setStackFocused = (payload) => {
            store.commit('setStackFocused', payload);
        }
        const setCardFocused = (payload) => {
            store.commit('setCardFocused', payload);
        }
        const toggleStackSelected = (payload) => {
            store.commit('toggleStackSelected', payload);
        }

        const selectedClosedStack = ref('');

        const closeAllStacks = () => {
            for (let id in stacks.value) {
                setStackClosed({
                    stackId: id,
                    closed: true
                });
            }
        }
        const openAllStacks = () => {
            for (let id in stacks.value) {
                setStackClosed({
                    stackId: id,
                    closed: false
                });
            }
        }

        const openSelectedStack = () => {
            console.warn('openSelectedStack', {
                selectedClosedStack: selectedClosedStack.value
            })
            if (selectedClosedStack.value) {
                setStackClosed({
                    stackId: selectedClosedStack.value,
                    closed: false
                });
            }
            // reset
            selectedClosedStack.value = '';
        }


        watch(selectedClosedStack, (newVal, oldVal) => {
            // when the selected closed stack changes to a value other than ''
            // call openSelectedStack
            if (newVal && newVal !== '') {
                openSelectedStack();
            }
        })

        const stackDragStart = (stackId) => {
            console.warn('stackDragStart', { stackId })
            draggingStack.value = { stackId };
        }
        const stackDrop = (onStack) => {
            console.warn('stackDrop', {
                draggingStack: JSON.parse(JSON.stringify(draggingStack.value)),
                onStack,
            });
            draggingStack.value = null;
        }
        const setShowPopup = (payload)=>{ store.commit('setShowPopup', payload)}
        const toggleCardSelected = ($event, card)=>{

            // if the event started ON or IN an input/textarea/button, return
            if (
                $event.target.tagName === 'BUTTON' 
                || $event.target.tagName !== 'INPUT' 
                || $event.target.tagName === 'TEXTAREA'
                || $event.target.closest('button')
                || $event.target.closest('input')
                || $event.target.closest('textarea')
            ) {
                console.warn('ignoring click on button or input...')
                return;
            }
            //$event.preventDefault();

            store.dispatch('toggleCardSelected', {card});
        }

        window.printCards = (cardsArray)=>{
            let output = cardsArray.reduce((output, card) => {
                output += card.content;
                return output;
            },'');
            return output;
        }
        
        // define currentThemeIndex (map to store state.currentThemeIndex)
        const currentThemeName = computed(() => store.state.AVAILABLE_THEMES[store.state.currentThemeIndex]);

        // define currentThemeName as a computed prop that maps to store state.AVAILABLE_THEMES[currentThemeIndex]
        const currentThemeIndex = computed({
            get: () => store.state.currentThemeIndex,
            set: (value) => store.commit('setCurrentThemeIndex', value)
        });

        // RETURN SETUP OBJECT
        // TODO: make building this a multi-phase process
        // 1. build the object
        // 2. merge in the computed properties
        // 3. merge in the methods
        // 4. return the object
        return {
            stacks,
            newCardNames,
            passFailPendingString,
            // View Options
            cardColumnsInput,
            stackColumnsInput,
            newStackName,
            ...Vuex.mapActions([
                'toggleEditCard',
            ]),
            addStack() {
                store.commit('addStack', { name: newStackName.value });
                //newStackNameInput.value.focus();
            },

            AVAILABLE_THEMES: store.state.AVAILABLE_THEMES,
            currentThemeIndex,
            currentThemeName,

            selectedStackToMerge,

            toggleCardSelected,

            openContextMenu,
            handleTouchStart,
            handleTouchEnd,
            selectMenuItem,
            menuPosition,
            contextMenu,
            contextMenuContext,

            stackDragStart,
            stackDrop,

            selectedStacks,

            // mapped mutations
            deleteStack,
            addCard,
            deleteCard,
            toggleCollapse,
            toggleStackSelected,
            collapseAll,
            expandAll,
            moveCard,
            setCardEditing,
            setCardContent,
            setNewStackName,
            setNewCardName,
            setCardSelected,
            setCardCompleted,
            setStackClosed,
            setStackFocused,
            setCardFocused,

            openAllStacks,
            closeAllStacks,

            dragStart,
            drop,
            newStackNameInput,
            blockClick(e) {
                e.stopPropagation();
            },
            onStackClicked(e, stackId) {
                // console.warn('onStackClicked', stackId)
                //return;

                // if we clicked on or within a .card class element
                // we want to toggle SelectCard instead
                if (e.target.classList.contains('card') || hasAncestorWithClass(e.target, 'card')) {
                    // console.warn(e.target.tagName, e.currentTarget.tagName);
                    // if we clicked a button or an input, return
                    if (
                        e.target.tagName === 'BUTTON' 
                        || e.target.tagName === 'INPUT' 
                        || e.target.tagName === 'TEXTAREA'
                    ) {
                        console.warn('ignoring click on button or input...')
                        return;
                    }

                    // get the card id from the data-card-id attribute
                    const closestCard = e.target.classList.contains('card') ? e.target : e.target.closest('.card');
                    const cardId = closestCard.dataset.cardId;
                    console.warn('card clicked',{
                        cardId,
                        closestCard,
                        //dataset: e.target.dataset,
                        //target: e.target
                    })
                    // get the card from the store
                    const card = store.state.stacks[stackId].cards[cardId];
                    // toggle the card's selected state
                    store.commit('setCardSelected', { card, status: !card.selected });
                    e.preventDefault();
                    return;
                }

                // if the event didn't originate ON or WITHIN a button or input or textarea
                // then we can assume it's a click on the stack
                // and we can toggleCollapse
                if (
                    e.target.tagName !== 'BUTTON' 
                    && e.target.tagName !== 'INPUT' 
                    && e.target.tagName !== 'TEXTAREA'
                ) {
                    this.toggleCollapse(stackId);
                } else {
                    console.warn('onStackClicked', {
                        tagName: e.target.tagName,
                        target: e.target
                    })
                }

                // if(store.state?.stacks?.[stackId]?.collapsed){
                //     e.preventDefault();
                //     this.toggleCollapse(stackId);
                // }
            },
            selectedClosedStack,

            openSelectedStack,
            setShowPopup,
            showPopup,

            onBGClicked(e){
              // deselect all stacks
              store.commit('deselectAllStacks');
            },

            TAG_HIDE_COMPLETE_TOGGLE,
            TAG_TEST_STACK,
            TAG_TEST_CARD,
            TAG_NAME_MAP,
        };
    }
});

document.addEventListener("DOMContentLoaded", async function(event) { 
    // wait for window.store to be defined
    while(typeof window.store === 'undefined'){
        console.warn('waiting for window.store to be defined');
        // wait 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    window.app = app;
    app.use(store);
    app.mount('#app');
});