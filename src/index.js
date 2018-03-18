import path from 'path';
import { createFilter } from 'rollup-pluginutils';
import { CLIEngine } from 'eslint';

function normalizePath(id) {
    return path.relative(process.cwd(), id).split(path.sep).join('/');
}

module.exports = function eslint(options = {}) {
    const cli = new CLIEngine(options);
    let formatter = options.formatter;

    if (formatter && typeof formatter !== 'function') {
        formatter = cli.getFormatter(formatter);
    }

    const filter = createFilter(
        options.include,
        options.exclude || /node_modules/
    );

    return {
        name: 'eslint',

        transform(code, id) {
            const file = normalizePath(id);
            if (cli.isPathIgnored(file) || !filter(id)) {
                return null;
            }

            const report = cli.executeOnText(code, file);
            const hasWarnings = options.throwOnWarning && report.warningCount !== 0;
            const hasErrors = options.throwOnError && report.errorCount !== 0;

            if (report.warningCount === 0 && report.errorCount === 0) {
                return null;
            }

            if (formatter) {
                const result = formatter(report.results);

                if (result) {
                    console.log(result);
                }
            } else {
                const { results: [{ messages = [] } = {}] } = report;

                messages.forEach(({ message, line, column }) => {
                    this.warn({ message, line, column: column - 1 });
                });
            }

            if (hasWarnings && hasErrors) {
                throw Error('Warnings or errors were found');
            }

            if (hasWarnings) {
                throw Error('Warnings were found');
            }

            if (hasErrors) {
                throw Error('Errors were found');
            }
        }
    };
}
