import Handlebars, { HelperDelegate } from 'handlebars';
import { marked } from 'marked';

const mdRenderer = new marked.Renderer();
mdRenderer.link = function(href, title, text) {
    const link = marked.Renderer.prototype.link.apply(this, arguments as any);
    return link.replace("<a", "<a target='_blank'");
};

class MarkdownEngine {
    handlebars: typeof Handlebars;
    private asyncResolvers: { [directive: string]: (token: string) => Promise<any> } = {};

    constructor() {
        this.handlebars = Handlebars.create();
    }

    registerAsyncResolver(directive: string, resolverFunction: (token: string) => Promise<any>) {
        this.asyncResolvers[directive] = resolverFunction;
    }

    registerToken(tokenName: string, resolver: HelperDelegate) {
        this.handlebars.registerHelper(tokenName, resolver);
    }

    async getAsyncDataForDirective(directive: string, token: string): Promise<any> {
        const resolver = await this.asyncResolvers[directive];
        if (!resolver) {
            throw new Error(`No resolver registered for directive: ${directive}`);
        }
        return await resolver(token);
    }

    extractDirectiveData(statement: any): { name?: string, param?: string } {
      if (statement.type === 'MustacheStatement' || statement.type === 'BlockStatement') {
          const name = statement.path?.original;
          const param = statement.params?.[0]?.original;

          return {
              name,
              param
          };
      }

      return {};
    }

    async preprocessData(content: string, tokens: Map<string, string>): Promise<{ content: string, data: any }> {
        let data: any = {};

        for (const [placeholder, originalDirective] of tokens.entries()) {
            const parsed = Handlebars.parse(originalDirective);
            const directiveData = this.extractDirectiveData(parsed.body[0]);
            const directive = directiveData?.name;
            const token = directiveData?.param;

            if (directive && token) {
                /*const tokenData = await this.getAsyncDataForDirective(directive, token);
                data[placeholder] = tokenData;*/
                content = content.replace(placeholder, originalDirective);
            }
        }

        return { content, data };
    }

    extractTokens(content: string): {modifiedContent: string, tokens: Map<string, string>} {
        const tokenRegex = /{{([A-Z0-9]+)[^}]*}}/g;
        const tokens = new Map<string, string>();
        let match;

        while ((match = tokenRegex.exec(content)) !== null) {
            const placeholder = `TOKEN_${tokens.size + 1}`;
            tokens.set(placeholder, match[0]);
            content = content.replace(match[0], placeholder);
            tokenRegex.lastIndex = 0; // Reset the regex state
        }

        return {modifiedContent: content, tokens};
    }

    injectTokens(content: string, tokens: Map<string, string>): string {
        let processedContent = content;

        tokens.forEach((value, key) => {
            processedContent = processedContent.replace(key, value);
        });

        return processedContent;
    }

    async render(markdownContent: string): Promise<string> {

        let {modifiedContent, tokens} = this.extractTokens(markdownContent);

        const md = marked.parse(modifiedContent, { renderer: mdRenderer });
        let { content, data } = await this.preprocessData(md, tokens);
        content = this.injectTokens(content, tokens); // Added this line to ensure we reinject before compiling
        const replacedContent = this.handlebars.compile(content)(data);

        return replacedContent;
    }
}

export { MarkdownEngine };
