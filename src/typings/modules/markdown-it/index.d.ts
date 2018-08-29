declare var MarkdownIt: {
    new (): MarkdownIt.MarkdownIt;
    new (presetName: "commonmark" | "zero" | "default", options?: MarkdownIt.Options): MarkdownIt.MarkdownIt;
    new (options: MarkdownIt.Options): MarkdownIt.MarkdownIt;
    (): MarkdownIt.MarkdownIt;
    (presetName: "commonmark" | "zero" | "default", options ?: MarkdownIt.Options): MarkdownIt.MarkdownIt;
    (options: MarkdownIt.Options): MarkdownIt.MarkdownIt;
}
  declare namespace MarkdownIt {
    export interface Token {
      attrs: string[][];
      block: boolean;
      children: Token[];
      content: string;
      hidden: boolean;
      info: string;
      level: number;
      map: number[];
      markup: string;
      meta: any;
      nesting: number;
      tag: string;
      type: string;

      attrIndex(attrName: string): number;
      attrJoin(name: string, value: string): void;
      attrPush(attr: string[]): void;
      attrSet(name: string, value: string): void;
    }

    export interface Rule {
      (state: any): void;
    }

    export interface Ruler {
      after(afterName: string, ruleName: string, rule: Rule, options?: any): void;
      at(name: string, rule: Rule, options?: any): void;
      before(beforeName: string, ruleName: string, rule: Rule, options?: any): void;
      disable(rules: string | string[], ignoreInvalid?: boolean): string[];
      enable(rules: string | string[], ignoreInvalid?: boolean): string[];
      enableOnly(rule: string, ignoreInvalid?: boolean): void;
      getRules(chain: string): Rule[];
      push(ruleName: string, rule: Rule, options?: any): void;
    }

    export interface RendererRule {
      (tokens: Token[], ix: number, options: any, env: any, md: MarkdownIt): string;
    }

    export interface Renderer {
      render(tokens: Token[], options: any, env: any): string;
      renderAttrs(token: Token): string;
      renderInline(tokens: Token[], options: any, env: any): string;
      renderToken(tokens: Token[], idx: number, options?: any): string;
      rules: { [tokenType: string]: RendererRule };
    }

    export interface ParserBlock {
      parse(src: string, md: MarkdownIt, env: any, outTokens: Token[]): void;
      ruler: Ruler;
    }

    export interface Core {
      process(state: any): void;
      ruler: Ruler;
    }

    export interface ParserInline {
      parse(src: string, md: MarkdownIt, env: any, outTokens: Token[]): void;
      ruler: Ruler;
      ruler2: Ruler;
    }

    export interface Options {
      html?: boolean;
      xhtmlOut?: boolean;
      breaks?: boolean;
      langPrefix?: string;
      linkify?: boolean;
      typographer?: boolean;
      quotes?: string | string[];
      highlight?: (str:string, lang:string) => string;
    }

    export interface MarkdownIt {
        render(md: string, env?: any): string;
        renderInline(md: string, env?: any): string;
        parse(src: string, env: any): Token[];
        parseInline(src: string, env: any): Token[];
        use(plugin: any, ...params: any[]): MarkdownIt;
        utils: {
            assign(obj: any): any;
            isString(obj: any): boolean;
            has(object: any, key: string): boolean;
            unescapeMd(str: string): string;
            unescapeAll(str: string): string;
            isValidEntityCode(str: any): boolean;
            fromCodePoint(str: string): string;
            escapeHtml(str: string): string;
            arrayReplaceAt(src: any[], pos: number, newElements: any[]): any[]
            isSpace(str: any): boolean;
            isWhiteSpace(str: any): boolean
            isMdAsciiPunct(str: any): boolean;
            isPunctChar(str: any): boolean;
            escapeRE(str: string): string;
            normalizeReference(str: string): string;
        }
        disable(rules: string[] | string, ignoreInvalid?: boolean): MarkdownIt;
        enable(rules: string[] | string, ignoreInvalid?: boolean): MarkdownIt;
        set(options: Options): MarkdownIt;
        normalizeLink(url: string): string;
        normalizeLinkText(url: string): string;
        validateLink(url: string): boolean;
        block: ParserBlock;
        core: Core;
        helpers: any;
        inline: ParserInline;
        linkify: LinkifyIt;
        renderer: Renderer;
    }
    interface LinkifyIt {
        tlds(lang: string, linkified: boolean): void;
    }
  }

  declare module 'markdown-it' {
	export = MarkdownIt;
}
