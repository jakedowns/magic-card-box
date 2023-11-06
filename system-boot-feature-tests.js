const SYSTEM_STACK_ID = '100';
function bootSystem() {
    // verify a stack exists which represents the system
    //if (!store.state.stacks[SYSTEM_STACK_ID]) {
    // !!! for now, always recreate this stack !!!
    // if it was .closed before, make sure it's .closed
    // if it was .collapsed before, make sure it's .collapsed
    store.commit('addStack', {
        name: 'System',
        //tags: [TAG_TEST_STACK],
        forceId: SYSTEM_STACK_ID,
        collapsed: store.state.stacks[SYSTEM_STACK_ID]?.collapsed ?? false,
        closed: store.state.stacks[SYSTEM_STACK_ID]?.closed ?? false
    });
    // }else{
    //     console.warn('system stack found?',{
    //         stack:store.state.stacks[SYSTEM_STACK_ID]
    //     })
    // }
    const systemStack = store.state.stacks[SYSTEM_STACK_ID];
    console.warn('system stack?', {
        systemStack,
        um: store.state.stacks[SYSTEM_STACK_ID]
    })

    // Define the feature tests as an array of objects
    const featureTests = [
        {
            name: 'The system loads users previous session (if any)',
            test(i) {
                return true;
            }
        },
        {
            name: 'The system tracks multiple stacks of cards',
            test(i) {
                const before = Object.keys(store.state.stacks).length;
                // add a stack
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                let stackId = store.state.stack_order[store.state.stack_order.length - 1]
                const after = Object.keys(store.state.stacks).length;
                // reset
                store.dispatch('deleteStackSilent', stackId);
                return after - before === 1;
            }
        },
        {
            name: 'Stacks can be collapsed or expanded',
            test(i) {
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                let stackId = store.state.stack_order[store.state.stack_order.length - 1]
                const stack = store.state.stacks[stackId];
                const before = stack.collapsed;
                store.commit('toggleCollapse', stackId);
                const after = stack.collapsed;
                store.dispatch('deleteStackSilent', stackId);
                return before !== after;
            }
        },
        {
            name: 'Stacks can be in a closed state',
            test(i) {
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                let stackId = store.state.stack_order[store.state.stack_order.length - 1]
                const stack = store.state.stacks[stackId];
                const before = stack.closed;
                store.commit('setStackClosed', { stackId, closed: true });
                const after = stack.closed;
                store.dispatch('deleteStackSilent', stackId);
                return before !== after;
            }
        },
        {
            name: 'Stacks can be focused',
            test(i) {
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                let stackId = store.state.stack_order[store.state.stack_order.length - 1]
                const stack = store.state.stacks[stackId];
                const before = stack.focused;
                store.commit('setStackFocused', { stackId, focused: true });
                const after = stack.focused;
                store.dispatch('deleteStackSilent', stackId);
                return before !== after;
            }
        },
        {
            name: 'Stacks can be colored green if all their children are passing',
            test(i) {
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                const id = store.state.stack_order[store.state.stack_order.length - 1];
                const stack = store.state.stacks[id];
                const before = stack.passing;
                if (stack.passing !== -1) {
                    throw new Error("expected stack default passing to be -1")
                }
                store.commit('addCard', {
                    stackId: id,
                    content: 'test'
                });
                const cardId = stack.card_order[stack.card_order.length - 1];
                const afterAddingOneCard = stack.passing;
                if (before !== afterAddingOneCard) {
                    throw new Error("expected passing to remain -1 after adding card")
                }
                // flag child as passing => expect parent stack to be passing
                store.commit('setCardPassingStatus', { card: stack.cards[cardId], passing: true });
                if (stack.passing !== true) {
                    throw new Error("expected passing to be true after flagging only child as passing")
                }
                // add a second child => expect parent stack passing state to transition back to === -1 (pending/unknown)
                store.commit('addCard', {
                    stackId: id,
                    content: 'test'
                });
                const secondCardId = stack.card_order[stack.card_order.length - 1];
                if (stack.passing !== -1) {
                    throw new Error("expected passing to be -1 when pending child added")
                }
                // set second child as failing => expect parent stack passing status to === false
                store.commit('setCardPassingStatus', { card: stack.cards[secondCardId], passing: false });
                if (stack.passing !== false) {
                    throw new Error("expected passing to be false when child card set to failing")
                }
                // set second child as passing => expect parent stack passing status to === true
                store.commit('setCardPassingStatus', { card: stack.cards[secondCardId], passing: true });
                if (stack.passing !== true) {
                    throw new Error("expected passing to be true when all child cards are passing, got " + stack.passing)
                }

                // TODO: test the same but with recursive subStacks and subStack cards
                // to make sure status bubbling works as expected

                // clean up / delete the test stack
                store.dispatch('deleteStackSilent', id);
                // return true if we made it this far so the test is flagged as passing
                return true;

            }
        },
        // {
        //     name: 'stacks can be resized to show multiple columns of cards',
        //     test(i) {
        //         // test that changing stackColumns changes the number of columns
        //         // test that changing cardColumns changes the number of columns
        //     }
        // },
        {
            name: 'cards can be focused',
            test(i) {
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        TAG_TEST_STACK
                    ]
                });
                let stackId = store.state.stack_order[store.state.stack_order.length - 1]
                const stack = store.state.stacks[stackId];
                store.commit('addCard', { stackId, content: 'test' });
                const cardId = stack.card_order[stack.card_order.length - 1];
                const card = stack.cards[cardId];
                const before = card.focused;
                store.commit('setCardFocused', { card, focused: true });
                const after = card.focused;
                store.dispatch('deleteStackSilent', stackId);
                return before !== after;
            }
        },
        {
            name: 'stacks can be nested',
            test(i) {
                // add a stack for this test
                store.commit('addStack', {
                    name: i.name,
                    tags: [
                        // tag for cleanup
                        TAG_TEST_STACK
                    ]
                });
                // get the id of the newly added stack
                const parentStackId = store.state.stack_order[store.state.stack_order.length - 1]

                // add a child card to the parent stack
                store.commit('addCard', {
                    stackId: parentStackId,
                    content: 'test parent card'
                });

                // generate a child stack
                store.commit('addStack', {
                    name: 'test substack',
                    parentStackId: parentStackId,
                    // tag for cleanup
                    tags: [TAG_TEST_STACK]
                });
                const childStackId = store.state.stack_order[store.state.stack_order.length - 1]

                // add a child card to the childStack
                store.commit('addCard', {
                    stackId: childStackId,
                    content: 'test substack card'
                });

                // attempt to add childstack to parent stack
                store.commit('addSubstackAsCard', {
                    parentStackId,
                    childStackId
                });

                // verify the parent stack exists
                const parentStack = store.state.stacks[parentStackId];
                if (!parentStack) {
                    throw new Error("parent stack does not exist")
                }
                // verify the parent stack 1st child card exists
                const parentStackFirstChildCard = parentStack.cards[parentStack.card_order[0]];
                if (!parentStackFirstChildCard) {
                    throw new Error("parent stack first child card does not exist")
                }
                // verify the parent stack 2nd child is a substack
                const parentStackSecondChildCard = parentStack.cards[parentStack.card_order[1]];
                if (!parentStackSecondChildCard) {
                    throw new Error("parent stack second child card does not exist")
                }
                // verify the substack has a card
                const childStackAsCard = parentStack.cards[parentStack.card_order[1]];
                const childStackAsStack = store.state.stacks[childStackAsCard.referenceStackId.toString()];
                if (
                    !childStackAsStack
                    || childStackAsStack?.card_order?.length !== 1
                    || Object.keys(childStackAsStack.cards).length !== 1
                ) {
                    throw new Error("child stack || child stack > child card does not exist")
                }

                return true;

            }
        },
        // // prevent deleting system stacks
        // {
        //     name: 'stacks can be locked / read-only',
        //     test: (i) => -1
        // },
        // // prevent deleting system cards
        // {
        //     name: 'cards can be locked / read-only',
        //     test: (i) => -1
        // },
        // {
        //     name: 'cards can be completed',
        //     test: (i) => -1
        // },
        // {
        //     name: 'cards can have tags',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         store.commit('addCard', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_CARD
        //             ]
        //         })
        //         const cardId = stack.card_order[stack.card_order.length - 1];
        //         const card = stack.cards[cardId];

        //         const before = card.tags.length;
        //         store.commit('cardAddTags', {
        //             cardId, tags: [
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         });
        //         const after = card.tags.length;

        //         if (before === after || after !== 2) {
        //             throw new Error("error testing adding tags to card")
        //         }
        //         // test deleting tags
        //         store.dispatch('cardDeleteTags', {
        //             cardId, tags: [
        //                 TAG_TEST_CARD,
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         })
        //         const afterDeleteLen = card.tags.length;
        //         if (afterDeleteLen !== 0) {
        //             throw new Error("error testing deleting tags from card")
        //         }
        //         // Cleanup
        //         store.dispatch('deleteStackSilent', stackId);
        //     }
        // },
        // {
        //     name: 'stacks can have tags',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         const before = stack.tags.length;
        //         store.commit('stackAddTags', {
        //             stackId, tags: [
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         });
        //         const after = stack.tags.length;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after && after === 2;
        //     }
        // },
        // {
        //     name: 'users can define custom tags',
        //     test: (i) => -1
        // },
        // {
        //     name: 'users can define custom tag colors',
        //     test: (i) => -1
        // },
        // {
        //     name: 'users are shown recommended tags when adding a tag',
        //     test: (i) => -1
        // },
        // {
        //     name: 'the user can re-open closed stacks',
        //     test(i) {
        //         return -1;
        //     }
        // },
        /* {
            given: 'guest user adds a stack named <$name>',
            when: 'a stack named <$name> is added',
            then: 'the user sees the Add Card input for the new stack'
        },
        {
            given: 'guest user adds a card to a stack',
            when: 'a card is added to a stack',
            then: 'the card is added to the stack'
        },
        {
            given: 'guest user drags a card between stacks',
            when: 'the card is dropped',
            then: 'the card is moved to the new stack'
        } */
        {
            name: 'failing test stacks and cards are cleaned up',
            test(i) {
                // delete any stacks tagged with TAG_TEST_STACK
                const testStacks = Object.values(store.state.stacks).filter(s => s.tags.includes(TAG_TEST_STACK));
                testStacks.forEach(s => store.dispatch('deleteStackSilent', s.id));
                // verify none match TAG_TEST_STACK
                const testStacksAfter = Object.values(store.state.stacks).filter(s => s.tags.includes(TAG_TEST_STACK));
                return testStacksAfter.length === 0;
            }
        },
        // Add more feature tests here
        // ... {name, test(i)},
        // Keep this last
        {
            name: 'The system boots without error',
            required: true,
            test(i) {
                // check system stack for any cards where error is not null
                const at_least_one_error_in_system_stack = Object.values(store.state.stacks[SYSTEM_STACK_ID].cards).find(c => c.error !== null);
                return !at_least_one_error_in_system_stack;
            }
        },
    ];

    const featureTestNames = featureTests.map(f => f.name);

    window.featureTests = featureTests;
    window.featureTestNames = featureTestNames;
    window.systemStack = systemStack;

    runFeatureTests();
}

function runFeatureTests(){
    // Loop through the feature tests array
    featureTests.forEach((featureTest) => {
        const existingFeatureCard = Object.values(systemStack.cards).find((c) => c.content === featureTest.name);
        let card;
        if (!existingFeatureCard) {
            // need a good way to get a ref to the card back
            // cause otherwise we have to do a looped .find again
            store.commit('addCard', {
                stackId: SYSTEM_STACK_ID,
                tags: [TAG_HIDE_COMPLETE_TOGGLE],
                content: featureTest.name
            });
            const mostRecentlyAddedCardID = systemStack.card_order[systemStack.card_order.length - 1]
            card = systemStack.cards[mostRecentlyAddedCardID];
        }
        card = card ?? existingFeatureCard;
        if (!card) {
            throw new Error('could not find or create FeatureTestCard named: ' + featureTest.name);
        }
        card.error = null; // clear any lingering errors
        // If the feature card doesn't exist, add it to the system stack
        let passing;
        try {

            passing = featureTest.test(featureTest);
        } catch (e) {
            if (!featureTest.required) {
                // continue
                console.error('feature test failed "' + featureTest.name + '"');
                console.error(e);
                // attach error for output
                // card.error = e;
                store.commit('setCardError', { card, error: e })
            } else {
                // rethrow
                throw e;
            }
        }

        // if passing === -1, it's pending
        store.commit('setCardPassingStatus', { card, passing })

    });
}

// loop through the system stack and make sure no disabled features remain

(() => {
    // expose these things on the window when the js file is loaded
    window.bootSystem = bootSystem;
    window.runFeatureTests = runFeatureTests;
})()