import Handlebars, { HelperDelegate } from 'handlebars';
import {marked} from 'marked';


class MarkdownEngine {
    handlebars: typeof Handlebars
    constructor() {
        // Initialize Handlebars
        this.handlebars = Handlebars.create();
    }

    /**
     * Register a custom token and its resolver.
     * @param tokenName - The name of the token (e.g. "BUTTON")
     * @param resolver - The function that resolves the token to HTML
     */
    registerToken(tokenName: string, resolver: HelperDelegate) {
        this.handlebars.registerHelper(tokenName, resolver);
    }

    /**
     * Render markdown content with registered tokens.
     * @param markdownContent - The markdown content with tokens
     * @returns - The rendered HTML content
     */
    render(markdownContent: string): string {
        // First, replace tokens using Handlebars
        const replacedContent = this.handlebars.compile(markdownContent)({});

        // Then, render the markdown using marked.js
        return marked.render(replacedContent);
    }
}

