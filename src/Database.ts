import { Model, Schema, connect } from 'mongoose';
import type { AoiClient } from 'aoi.js';

export interface DatabaseOptions {
    url: string;
    tables?: string[] | string | (string | undefined)[];
}

export class Database {
    readonly #tables: Map<string, Model<any>> = new Map();
    public client: AoiClient;

    constructor(client: AoiClient, options: DatabaseOptions) {
        options.tables = Array.isArray(options.tables) ? options.tables : [options.tables, '__aoijs_vars__'];
        for (const table of options.tables) {
            if (typeof table !== 'string') continue;
            this.#tables.set(
                table,
                new Model(
                    table,
                    new Schema({
                        key: { type: String, required: true },
                        value: { type: Schema.Types.Mixed, required: false }
                    })
                )
            );
        }

        this.connect(options.url);
        this.client = client;
        this.client.db = this;
    }

    public table(name: string): Model<any> | undefined {
        return this.#tables.get(name);
    }

    public get tables(): string[] {
        return [...this.#tables.keys()];
    }

    private async connect(url: string) {
        await connect(url);
    }

    private makeKey(key: string, id?: string): string {
        return id ? `${key}_${id}` : key;
    }

    private async prepare(table: string) {
        if (!this.tables.includes(table))
            throw new Error(`Table "${table}" is not defined in options. Please provide it!`);
        if (this.table(table)) return;

        const model = new Model(
            table,
            new Schema({
                key: { type: String, required: true },
                value: { type: Schema.Types.Mixed, required: false }
            })
        );

        this.#tables.set(table, model);
        return model;
    }

    private async model(table: string): Promise<Model<any> | undefined> {
        let model: Model<any> | undefined = this.table(table);
        if (!model) model = await this.prepare(table);
        return model ? model : void 0;
    }

    public async get(
        table: string,
        key: string,
        id?: string
    ): Promise<
        | {
              key: string;
              value: any;
          }
        | undefined
    > {
        const model = await this.model(table);
        if (!model) return;

        const result = await model.findOne({ key: this.makeKey(key, id) });
        if (['cooldown', 'setTimeout', 'ticketChannel'].includes(key)) {
            return result ? result : void 0;
        }

        const defaultValue = this.client?.variableManager?.get(key, table)?.default;
        return (result ? result : defaultValue) ?? void 0;
    }

    public async set(table: string, key: string, id: string | undefined, value: any): Promise<boolean> {
        const model = await this.model(table);
        if (!model) return false;

        const data = { key: this.makeKey(key, id), value };
        await model.findOneAndUpdate({ key: this.makeKey(key, id) }, data, { upsert: true });
        return true;
    }
}
