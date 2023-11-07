/**
 * System > Sandboxes
 * Sandboxes are isolated execution environments that can exist in parallel
 * Sandbox > Fields (the literal data and control flow of the program)
 * Sandbox > Executor (the class responsible for stepping and monitoring execution)
 * 
 * when we want to execute any program,
 * we must first define a sandbox
 * the program launches with a default sandbox
 * others can be created dynamically
 * 
 * when a sandbox is created, an executor instance (singleton) is created
 * multiple executors can act within a sandbox, but for now we focus on 1
 * 
 * the executor will automatically jump to the entry point of the field (the designated subfield which is the starting point of execution)
 * if the entrypoint is executable, it will begin until it reaches a wait or stop point
 * if it is not, the executor will enter an idle state, waiting for input from the user or the system
 */


const themeNames = {
    THEME_DARK: 'Dark', // DEFAULT
    THEME_DARK_STATUS_COLORS: 'Dark with Status Colors',
    THEME_LIGHT: 'Light',
    THEME_LIGHT_STATUS_COLORS: 'Light with Status Colors'
};
const AVAILABLE_THEMES = Object.values(themeNames);

const DEFAULT_STATE = {

    // Sandboxes
    sandboxes: {},
    // eventually, i want to allow the user to run multiple sandboxes simultaneously
    // like docker containers
    // for now, let's focus on being "within" the context of one sandbox at a time
    // SandboxContext:
    currentlyViewedSandboxID: null,
    lastSandboxCreatedID: null, // the most recently created sandbox id

    // Executors
    executors: {},

    
    // could separate the value and a frontEnd specific themeSwitcherSelection that would require user to press "confirm" to save the change... but let's just tie the v-model directly to the store for now
    // currently selected theme...
    currentTheme: window.THEME_DARK, // default
    AVAILABLE_THEMES: AVAILABLE_THEMES, // doesn't need to be in store

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

    // ---
    // BEGIN FLOW FIELD REFACTOR
    // ---
    // fields (our flow fields)
    fields: {},
    field_views: {
        default_order: [], // an ordered list of field ids
    }, // our map of arrays of ordered fields
    currentFieldViewID: 'default_order',
    // the last field id we created
    lastFieldID: null, 
    // currentRootField
    // the currently selected root field
    // eventually we'll allow side-by-side browsing of root fields simultaneously
    // but for now, let's start with 1 root field at a time
    // clicking into a subfield will make it the current root field
    // if the current root field has a parent field, we'll have a back or "up" button
    // allowing you to zoom out / up back to the parent level
    // if the root field has no parents, it's the top level field
    currentlyViewingFieldID: null,

    /** @Map < @Method > */
    methods: {},
    

    //
    // a literal field object
    CONST: { 

        /** 
         * Field Types: 
         * + field_literal
         * + field_plain
         * + field_function
         * + field_field
         * + field_root_field
         * 
        */
        TYPES: {

            // the default type for now
            PLAIN: 'plain', // aka an Object, Map, Hashtable

            LITERAL: 'literal',
            
                STRING: 'string',
                NUMBER: 'number',

            ROOT_FIELD: 'rootField',
            FIELD: 'field',
            
            // Method vs. Function?
            FUNCTION: 'function',
            CALLBACK: 'callback',

            OBSERVABLE: 'observable',
            STREAM: 'stream',
            EVENT: 'event',
            
            PROMISE: 'promise',

            // try not to use these
            // pass around IDs of type string instead
            REFERENCE: 'reference',

        },

        TAGS: {
            // used for cleaning up all feature test fields by tag...
            FEATURE_TEST_FIELD: 'featureTestField',

            EXECUTABLE: 'executable',
            FLAGGABLE: 'flaggable',
            LOGGABLE: 'loggable',
            GENERATOR: 'generator',

            // adding the timer tag to a field will cause it to be executed on a timer
            // there are sensable defaults,
            // but it can be configured,
            // or you can replace the implementation with your own
            // timers can either execute code periodically,
            // or once after a fixed delay
            // if the user closes their computer and the timer is resumed, wall time is used to calculate the delay until next execution
            TIMER: 'timer',

            MARQUEE: 'marquee',
            CLOCK: 'clock',
            TODO_LIST: 'todoList',
            WEATHER: 'weather',
            SUN_POSITION: 'sunPosition',
            MOON_POSITION: 'moonPosition',
            USER_LOCATION: 'userLocation',
            LOOP_FN: 'loopFN',
            SYNC_FN: 'syncFn',
            ASYNC_FN: 'asyncFn',
            // TODO:
            // debounced_fn
            // throttled_fn

        },

        TIMER_TYPES: {
            // aka DELAY aka TIMEOUT ?
            DELAY: 'delay',
            INTERVAL: 'interval',
        },
        
        // our generator types
        GENERATORS: {

            UUID: 'uuid',
            RANDOM: 'random',
            CLOCK: 'clock'

        }
    },
}

/**
 * We're refactoring Cards and Stacks into a Fractal "field" system
 * Fields are collections of Fields
 * > might get confusing based on the ambiguity of the word "field" as it's conventionally used in programming
 * > but we mean it in the Physics sense, as in a "field of study"
 * > what's an alternative word for this?
 * > * "collection", "group", "set", "category", "cluster", "family" is too generic
 * > * "stack" and "card" run into the problem of needing to write 2x the code when they really do the same thing
 * > * for now let's go with "field" and see how it goes
 */

class MMethod {
    constructor(name, fn, args, context){
        // if the fn is a string, we need to eval it
        // skip that trap for now
        this.name = name;
        this.fn = fn;
        this.context = context;
        this.arguments = args;
    }

    execute(){
        if(!this.fn){
            throw new Error("Method not defined")
        }
        // execute the fn with the given context and args
        return this.fn.apply(this.context, this.arguments)
    }
}

// compile-time typechecking is better
// but, maybe there's still a case to be made for runtime typechecking
/** 
 * a method with a strict return type 
*/
class TypedMethod {}

/**  */
class TypedField {}

/* 
    candidate root class unless we define something more generic 
*/
class TaggableArray {
    constructor() {
        this.tags = [];
    }
    addTag(tag) {
        this.tags.push(tag);
    }
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
        }
    }
}

class TaggableObject {
    constructor() {
        this.tags = {};
    }
    addTag(tag) {
        this.tags[tag] = true;
    }
    removeTag(tag) {
        delete this.tags[tag];
    }
}

// ok so, the question now is, did we just 
// stoner-logic our way backwards into Object and Array data structures?
// seems like we're reinventing the wheel,
// but in a way, we're just double-checking the default assumptions
// of the current "wheel" (cross-platform distributed application development)...
// we're just making sure we're not missing anything obvious
// > alt: and we're finding out the wheel isn't as round as we thought it was — GPT-4

// so what do we have here, we have a Taggable that abstracts
// an underlying implementation based on an array and one on an object so we can
// run tests and compare performance benchmarks



class Taggable {
    constructor(mode = 1) {
        // if(mode === 1){
            this.arrModeActive = true;
            this.objModeActive = false;
        // }

        if (this.arrModeActive) {
            this.tags = new TaggableArray();
        }

        if (this.objModeActive) {
            this.tags = new TaggableObject();
        }
    }
    addTag(tag) {
        this.tags.addTag(tag);
    }
    addTags(tags){
        this.tags.addTags(tags);
    }
    removeTag(tag) {
        this.tags.removeTag(tag);
    }
    remmoveTags(tags){
        this.tags.removeTags(tags);
    }
}
class TagFlaggable  {

    // props
    flags = {}
    
    // methods
    addFlag(flag){
        this.flags[flag] = true;
    }
    addFlags(flags){
        throw new Error("not implemented")
    }
    removeFlag(flag){
        delete this.flags[flag];
    }
    removeFlags(flags){
        throw new Error("not implemented")
    }
    hasFlag(flag){
        return !!this.flags[flag]
    }
}
class Field {
    id = null
    name = null
    sandboxID = null
    parentFieldID = null
    childFieldIDs = []
    tags = []

    defaultEntryPoint = null
    entry_points = {}
    literals = {}

    constructor({
        id, 
        name,
        sandboxID, 
        parentFieldID, 
        childFieldIDs, 
        tags
    }){
        this.id = id ?? 'field_'+Date.now();
        this.name = name ?? this.id;
        this.sandboxID = sandboxID;
        // fields hold references to literals, and other fields
        // you can think of them as sub fields, or child fields
        // but really, they're non-heirarchical and any arbitrary field can be defined with
        // first-order relationships to any other fields, like nodes in a graph

        // all fields are stored in the Store in a flat map
        // we do not pass fields Class Instance Objects around, we only pass around their String IDs
        // this is because, for performance, we want to be able to look up data in the shallowest 
        // way possible (i.e. without having to traverse a tree of nested objects)

        this.defaultEntryPoint = null; // the default entry point for this field
        this.entry_points = {}; // a map of entry points for this field
        
        // we call a setter so it gets reflected to the server,
        // or we let the store just reflect to the server during a filtered list of mutation types
        //this.setFlag('')

        // let's try a map
        this.literals = {};

        this.tags = tags ?? [];

        this.childFieldIDs = childFieldIDs;

        this.parentFieldID = parentFieldID;

        // if this.sandboxID is not null,
        // see if the sandbox has a rootFieldID
        // if not, set it to this field
        if(this.sandboxID && !store.state.sandboxes[this.sandboxID]){
            //throw new Error("sandbox not found "+this.sandboxID)
            console.error("Field Constructor sandbox not found " + this.sandboxID + ' adding field named: '+ this.name)
        }else if(this.sandboxID){
            // console.log('referring to sandbox',{
            //     sID: this.sandboxID,
            //     availableSBIDS: Object.keys(store.state.sandboxes)
            // })
            // TODO: add constructor option that allows us to FORCE override the field when it is set
            store.state.sandboxes[this.sandboxID].registerField(this.id);
        }else{
            // noop, no sandbox to reference
        }
        
    }

    setLiteral(literalName, literalValue){
        this.literals[literalName] = literalValue;
    }
    
}

/**
 * @class Executor
 * this class walks the fields,
 * and executes the various sub-fields along the way
 * 
 * by default there's one
 * 
 * but by design, we can have multiple executors to run in parallel
 * 
 * NOTE: since, by design, fields can contain arbitrary references
 * there is a possibility of infinite recursion and circular references
 * because of this, the executor needs to keep track of which field IDs it has already executed during a given pulse step, to prevent infinite recursion
 */
class Executor {
    sandboxID = null;
    // track which ids we've already executed this pulse
    // to prevent infinite recursion
    fieldIDsPulsedThisPulse = [];
    constructor({sandboxID}){
        this.sandboxID = sandboxID;
    }
    get sandbox(){
        return store.state.sandboxes[this.sandboxID]
    }
    pulse(){
        // reset tracking field
        this.fieldIDsPulsedThisPulse = [];
        if(!this.sandboxID){
            //console.warn('Executor.pulse() no sandboxID found')
            return;
        }
        const sb = this.sandbox;
        if(!sb){
            throw new Error("sandbox not found "+this.sandboxID)
        }
        if(!sb.rootFieldID){
            console.warn('Executor.pulse() no root field found for sandbox '+this.sandboxID)
            return;
        }
        const rootField = store.state.fields[sb.rootFieldID];
        if(!rootField){
            console.warn('Executor.pulse() no root field found for sandbox '+this.sandboxID)
            return;
        }

        // if the root field is tagged as an executable, we should throw an error
        // the root field of any sandbox should probably be some kind of executable type, no?

        this.executeField(rootField);
    }

    executeField(field){
        this.fieldIDsPulsedThisPulse.push(field.id);
        // TODO: could pass in things like the current frame count or delta time
        // but we can also track/expose these things in singleton classes that can be
        // referenced on an as-needed basis, rather than having to pass around context
        // to each pulse
        // > but if that does become helpful, we can pass a context down here
        // > like a current stack for a rudimentary call stack for debugging, etc...
        field.pulse();
    }
}

// let's define a sandbox with some fields
class Sandbox {
    id = null;
    executor = null;
    rootFieldID = null;
    rootFieldIDs = [];
    constructor({id}){
        this.id = id ?? 'sandbox_'+Date.now();
        this.executor = new Executor(this.id);
        this.programCounter = 0;
        this.steps = [];
        // accumulator
        this.step_output = []; 
        // final
        this.output = {};
        this.fields = [];
    }

    swapSteps(step1, step2){
        // swap the order of the steps
    }

    registerStepWithExecutor(step){
        // register callback to execute the step
    }

    registerField(fieldID){
        // assume the first field we register is the root field
        if(this.rootFieldID === null){
            this.rootFieldID = fieldID;
        }
        this.rootFieldIDs.push(fieldID);
        // de-dupe
        this.rootFieldIDs = [...new Set(this.rootFieldIDs)];
    }

    // associate a field with this Sandbox
    addField(field){
        // track the id of the field so we can refer to it later
        this.fields.push(field.id); 

        // if the field has a parentFieldID, update the parent field's ChildFieldIDs array
        if(field.parentFieldID){
            // get the parent field
            const parentField = this.fields[field.parentFieldID];
            // add the child field to the parent field's childFieldIDs
            parentField.childFieldIDs.push(field.id);
            // de-dupe
            parentField.childFieldIDs = [...new Set(parentField.childFieldIDs)];
        }

        // as we go through each point in space
        // prioritized via the BSP tree
        // if there's anything to execute (kick off callback)
        // kick it off
    }

    // for now the sandbox _is_ the Executor
    // in the future, we may extract the Executor to a separate class

    // nested state machines
    // with built in replication
    // version history
    stepExecution(){
        // if there are no more steps, we're done
        if(this.programCounter == this.steps.length){
            return {done: true, output: this.output};
        }

        this.programCounter++;
        this.step_output[this.programCounter] = this.steps[this.programCounter].execute();
        // otherwise, try to execute the current step
        // if it fails and continueOnError is true, then we continue
        // otherwise, we return the error and prevent further execution
        // unless what if we don't NEED to prevent further execution,
        // and could let the caller choose? we'll look into that...


    }
}

class Timer {
    
    callbackIn(fn, sec){
        this.fn = fn;
        this.clearFn = clearTimeout;
        this.sec = sec;
        this.timer = setTimeout(this.fn, this.sec * 1000);
    }

    callPeriodically(fn, sec){
        this.fn = fn;
        this.clearFn = clearInterval;
        this.sec = sec;
        this.timer = setInterval(this.fn, this.sec * 1000);
    }

    stop(){
        this.clearFn()
        this.timer = null;
    }

}

class DebouncedCallback {

}
class ThrottledCallback {

}

/**
 * 
 */
class Class {
    constructor(name){
        this.type = 'Class'
        this.name = name
    }
}

class Method {
    constructor(name){
        this.type = 'Method'
        this.name = name
    }
}

class Callback {
    constructor(name){
        this.type = 'Callback'
        this.name = name
    }
}

class Camera {
    constructor(){

    }
}

// you can have multiple nested instances of these
class InfiniteCanvas {
    constructor(){
        this.canvas_views = []
        
        // the "frame"
        this.canvas = null

        this.cameras = {
            "rootCamera": new Camera()
        }
        this.defaultCameraID = "rootCamera"
        this.activeCameraID = null
    }
}

/** todo extend a common open source math lib for vector types */
class SpacetimePoint {
    constructor(x,y,z,w){
        this.type = 'SpacetimePoint'
        this.x = x
        this.y = y
        this.z = z
    }
}

// Fields must contain at least on default entrypoint
// multiple entrypoints can be defined
// if no default is specified, the first defined entrypoint is used
class FieldEntrypoint extends SpacetimePoint {

}

class DataTable {

}

class Stream {

}

/*
    We don't just offer standard programming primitives
    we offer higher-level abstractions that are more
    user-friendly and mobile-xr-first
*/

// some things are selectable
class Selectable {}

// some things are sortable (via given properties)
class Sortable {}
// sorting happens within volumes which 
// use expensive tracking algorithms to monitor
// the position of objects within the volume
class SortingArea {}
class SortingStack {}

// Some things in the system are grabbable by grabbers
class Grabbable {}
class Grabber {}

// The system utilizies 
// Graphs and Trees as just two means of visualizing
// data within the system
class Node {}
class Graph {}
class Tree {}

// Primitives for Vuex-like Flux-based central DataStore
// TODO: extend with namespaced modules...
// for now, just use a single global store
class Action {}
class Store {}

// Local and Networked EventSystems
class ActionDispatcher {}
class ActionReceiver {}

/* Using these primitives, and our remote data storage */

// okay let's think about other default assumptions in our system and the TAGs we'd like to 
// attributes to types
// for example:
// Loggable (something that get's log messages written about it / from it)
// Computable (something that can be re-evaluated)
// Generator Types (something that can be lazily or eagerly evaluated)
// Async Types (something that can be evaluated asynchronously)
// and the concept of waiting via a Promise / Await paradigm thanks to Javascript
/**
 * @class TagLoggable
 * this is a Tag that gives special attributes to the tagged object
 * it's a way of extending objects at runtime with new functionality
 * allowing faster iteration, development
 * and faster visual refactoring of code
 * 
 * at a fundamental level, this class basically just extends an object with
 * a new method that can be called on it to output to a log
 * 
 * most higher level classes will contain this tag by default
 * some might prevent it from loading with a Suppression Tag at runtime to silence it
 * 
 * as a means to help enforce usable debugging messages, we expect that the user might want to send
 * an integer to represent the category for filtering
 * by default the category is set to LogCategory.DEFAULT
 * this is also used for basic log level filtering:
 * LogLevel.DEBUG
 * LogLevel.INFO
 * LogLevel.WARN
 * LogLevel.ERROR
 */
class TagLoggable {
    constructor(){

    }
}

// extend a method to declare it as a generator function
class TagGenerator {
    constructor(){
        this.iterationCount = 0;
        this.reachedEnd = false;
    }

    // should we have a prev?

    next(){
        this.iterationCount++;
        if(this.reachedEnd){
            return {done: true}
        }
    }

    thunk(){
        return this.next();
    }

}

class TagSearchable {
    // what to index when indexing this object
}
class Cachable {
    // what to cache when caching this object
    // how to cache it
    // when to re-cache it
}

/**
 * the second class in our system (we're trying to use as few primitive types as possible)
 * is going to be the "Literal" class
 * it represents a literal value (string, number, boolean, etc)
 * it's a leaf node in our tree of data
 * it's cached for quick reads across any code that references it
 * it can be re-evaluated in a centralized shallow cache, to update all references to it
 * it's based on Vue's memoized computed property system
 */
class Literal {
    constructor(type,value){
        this.type = type;
        this.value = value;
        // switch(type){
        //     case 'string':
        //     case 'number':
    }
    update(value){
        this.value = value
        // broadcast to all observers
    }
}

/**
 * @class Time
 * represents a slice of time or a instance in time
 * it can be a duration, a timeline, it's just a namespace for time primitives
 */
class Time {
    // constructor defaults
    /**
     * - defaults to "now"
     * - can be represented as a string integer
     * - can have pre-defined chapters
     * - can have pre-defined pause, resume points and skip points
     * --- ∆∆∆ {[SPECIAL METHODS]} ∆∆∆ ---
     * ∆ .now() - returns a new Time instance with the current time
     * ∆ .pause() - returns a new PausedTime instance with the current time
     * ∆ .resume() - returns a new running Time instance with the current time
     * ∆ .skip() - skips ahead in a timeline, if it's playing, it'll continue, if it's paused, it'll remain so
     * ∆ .rewind() - plays a timeline in reverse at the current @PlaybackRate
     * ∆ .fastForward() - plays a timeline forward at the current @PlaybackRate
     * --- ∆∆∆ {{[SPECIAL FUNCTIONS]}} ∆∆∆ ---
     * √ .play({@PlaybackRate}) - plays a timeline forward at the given @PlaybackRate
     * √ .configure({@PlaybackConfigurationOptions}) - overrides the default @PlaybackConfigurationOptions
     * √ .deconstruct() - returns a pointer to the now deconstructing Time instance
     * ---
     */ 
    constructor(){

    }

    /**
     * Using this method we write the method to the database
     */
    save(){
        // call the server to save this instance to the database
        store.dispatch('saveTime', this)
    }

    /**
     * attach a Field to another one
     */
    //associate(FieldAssociationConfigurationOptions)

    /**
     * @Requirement it is written in typescript
     */
    
    /**
     * @Destructor
     */
    destruct(){
        // delete this instance from the database
        // store.dispatch('deleteTime', this)
    }

    /**
     * @Deletor
     */
    delete(){
        /* the */
    }

    /*
    @PlannedObsolecence
    @SelfDeletingCode
    @ThisCodeWillSelfDestructIn_TimeRange
    @ThisCodeWillSelfDestructAfter_TimeRange
    @ThisCodeWillNeverSelfDestructForNow
    @ThisCodeWillSelfDestructRandomly
    */

    /*
    @FunTypingGame Goal: "I loved learning to type with this game!"
    */

    // howDoesThisFunctionImpactHumanity?


    /**
     * when the console prints a Time object, we use this method to override the default behavior
     * of printing the object's properties, and instead print a human readable string
     * @returns {string} - a human readable string representation of the Time instance
     */
    toString(){
        // generate a human readable string
        // for now JSON.stringify
        const output = JSON.stringify(this)
        return output;
    }
}

/**
 * The next @class in our @System is the "FieldView"
 * It is simply an ordered list of Field IDs
 * used to lay them out in a particular order,
 * in order to "view" them from a particular perspective,
 * or consume them via the api in a particular order
 * (Used by plugins to extend the @View @System and enable
 * UGC themes and layouts / sorting / filtering / etc...)
 * Think of it like a Cursor in a Database
 */
class FieldView {
    constructor(){
        /* a 1-Dimensional list of fields */
        /* 
            we may some day want 2D and 3D or even ND FieldView data structures 
            let's work with 1 strip of fields at a time for now...
        */
        this.field_ids = []
    }
    addField(field_id){
        this.field_ids.push(field_id)
    }
    removeField(field_id){
        this.field_ids.splice(this.field_ids.indexOf(field_id),1)
    }
    swapFieldPositions(field_id_1, field_id_2){
        /* slightly unreadable, but fastest */
        const index_1 = this.field_ids.indexOf(field_id_1)
        const index_2 = this.field_ids.indexOf(field_id_2)
        this.field_ids[index_1] = field_id_2
        this.field_ids[index_2] = field_id_1
    }
    insertFieldAt(field_id, index){
        this.field_ids.splice(index,0,field_id)
    }
    prependField(field_id){
        this.field_ids.unshift(field_id)
    }
}


function setupStore(){

    const store = Vuex.createStore({
        state() { return DEFAULT_STATE; },
        mutations: {
            // we need a better way to do basic mutations without having
            // to define a mutation for every top level / nested state property
            setTheme(s, theme){
                s.theme = theme;
            },
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
            /** @deprecated @use setFieldPassingStatus */
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
            setFieldPassingStatus(s, { field, passing }){
                s.fields[field.id].passing = passing;
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

            addExecutor(s, payload){
                const new_id = payload?.id ?? ''+Date.now();
                s.executors[new_id] = new Executor(payload);
                s.lastExecutorID = new_id
            },
            deleteExecutor(s, executorID){
                if(!s.executors[executorID]){
                    console.error('executor not found', {executorID})
                    return
                }
                delete s.executors[executorID]
            },

            addSandbox(s, payload){
                const new_id = payload?.id ?? ''+Date.now();
                s.sandboxes[new_id] = new Sandbox(payload);
                s.lastSandboxID = new_id
            },

            deleteSandbox(s, sandboxID){
                if(!s.sandboxes[sandboxID]){
                    console.error('sandbox not found', {sandboxID})
                    return
                }
                delete s.sandboxes[sandboxID]
            },

            addField(s, payload){
                const new_id = payload?.id ?? ''+Date.now();
                s.fields[new_id] = new Field(payload ?? {});
                s.lastFieldID = new_id
            },
            deleteField(s, fieldID){
                if(!s.fields[fieldID]){
                    console.error('field not found', {fieldID})
                    return
                }
                delete s.fields[fieldID]
                console.warn('todo: delete the field id from all field_order views');
            },
            fieldAddTags(s, { fieldID, tags }) {
                console.warn(s.fields[fieldID]);
                s.fields[fieldID].tags = [...new Set([...s.fields[fieldID].tags, ...tags])];
            },
            fieldRemoveTags(s, { fieldID, tags }) {
                s.fields[fieldID].tags = s.fields[fieldID].tags.filter(t => !tags.includes(t));
            }
        },
        actions: {

            addField(context, payload){
                context.commit('addField', payload)
                return context.state.lastFieldID
            },
            deleteSelectedStacks(context){
                if(confirm(`Are you sure you want to delete ${all_these_things} ?`)){
                    context.state.selectedStacks.forEach(stackId => {
                        context.commit('deleteStackSilent', stackId);
                    });
                    context.commit('deselectAllStacks');
                }
            },
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

                // hydrate Executors
                for (let id in this.state.executors) {
                    this.state.executors[id.toString()] = new Executor(this.state.executors[id.toString()]);
                }

                // hydrate Sandboxes
                for (let id in this.state.sandboxes) {
                    this.state.sandboxes[id.toString()] = new Sandbox(this.state.sandboxes[id.toString()]);
                }

                // hydrate Fields
                for (let id in this.state.fields) {
                    this.state.fields[id.toString()] = new Field(this.state.fields[id.toString()]);
                    //this.state.fields[id.toString()].tags = this.state.fields[id.toString()].tags ?? [];
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

            case 'addField':
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

        if (mutation.type === 'addField') {
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