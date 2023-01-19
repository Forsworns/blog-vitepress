declare module 'markdown-it' {
    import MarkdownIt from 'markdown-it';
    import Token from 'markdown-it/token';
    import StateInline from 'markdown-it/rules_inline/state_inline';
    import StateBlock from 'markdown-it/rules_block/state_block';

    export { Token, StateInline, StateBlock };
    export default MarkdownIt;
}

declare module 'lodash.debounce' {
    import debounce from 'lodash.debounce';
    export default debounce;
}