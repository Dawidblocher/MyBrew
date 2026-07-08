import type { createClient } from "@/lib/supabase";
import type { RecipeRecordRow } from "@/lib/recipe-mappers";
import type { RecipeInsert } from "@/types";

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

interface FakeState {
  rows: RecipeRecordRow[];
  nextId: number;
}

type Operation = "select" | "insert" | "update" | "delete";

interface Filter {
  col: string;
  val: unknown;
}

class RecipesQueryBuilder {
  private operation: Operation = "select";
  private selectCols = "*";
  private filters: Filter[] = [];
  private insertPayload?: RecipeInsert;
  private updatePatch?: Record<string, unknown>;
  private orderSpec?: { col: string; ascending: boolean };
  private terminal: "many" | "maybeSingle" | "single" = "many";

  constructor(private readonly state: FakeState) {}

  select(cols: string): this {
    this.selectCols = cols;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderSpec = { col, ascending: opts?.ascending ?? true };
    return this;
  }

  insert(row: RecipeInsert | RecipeInsert[]): this {
    this.operation = "insert";
    this.insertPayload = Array.isArray(row) ? row[0] : row;
    return this;
  }

  update(patch: Record<string, unknown>): this {
    this.operation = "update";
    this.updatePatch = patch;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  maybeSingle(): Promise<QueryResult<RecipeRecordRow | null>> {
    this.terminal = "maybeSingle";
    return this.run();
  }

  single<T = RecipeRecordRow>(): Promise<QueryResult<T>> {
    this.terminal = "single";
    return this.run() as Promise<QueryResult<T>>;
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private applyFilters(rows: RecipeRecordRow[]): RecipeRecordRow[] {
    return rows.filter((row) => this.filters.every(({ col, val }) => (row as Record<string, unknown>)[col] === val));
  }

  private applyOrder(rows: RecipeRecordRow[]): RecipeRecordRow[] {
    if (!this.orderSpec) return rows;

    const { col, ascending } = this.orderSpec;
    return [...rows].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[col];
      const bVal = (b as Record<string, unknown>)[col];
      if (aVal === bVal) return 0;
      if (aVal == null) return ascending ? -1 : 1;
      if (bVal == null) return ascending ? 1 : -1;
      return ascending ? (aVal < bVal ? -1 : 1) : aVal < bVal ? 1 : -1;
    });
  }

  private projectRow(row: RecipeRecordRow): Record<string, unknown> {
    if (this.selectCols === "*") return { ...row };

    const cols = this.selectCols.split(",").map((c) => c.trim());
    const projected: Record<string, unknown> = {};
    for (const col of cols) {
      projected[col] = (row as Record<string, unknown>)[col];
    }
    return projected;
  }

  private insertRow(): RecipeRecordRow {
    if (!this.insertPayload) {
      throw new Error("insert() payload missing");
    }

    this.state.nextId += 1;
    const now = new Date().toISOString();
    const row: RecipeRecordRow = {
      id: `recipe-${this.state.nextId}`,
      user_id: this.insertPayload.user_id,
      name: this.insertPayload.name,
      style: this.insertPayload.style,
      blg: this.insertPayload.blg,
      srm: this.insertPayload.srm,
      ibu: this.insertPayload.ibu,
      abv: this.insertPayload.abv,
      data: this.insertPayload.data,
      created_at: now,
      updated_at: now,
    };

    this.state.rows.push(row);
    return row;
  }

  private run(): Promise<QueryResult<unknown>> {
    switch (this.operation) {
      case "insert": {
        const row = this.insertRow();
        return Promise.resolve({ data: this.projectRow(row), error: null });
      }

      case "update": {
        const matching = this.applyFilters(this.state.rows);
        if (matching.length === 0) {
          return Promise.resolve({ data: [], error: null });
        }

        for (const row of matching) {
          Object.assign(row, this.updatePatch);
        }

        const projected = matching.map((row) => this.projectRow(row));
        return Promise.resolve({ data: projected, error: null });
      }

      case "delete": {
        const toDelete = new Set(this.applyFilters(this.state.rows));
        this.state.rows = this.state.rows.filter((row) => !toDelete.has(row));
        return Promise.resolve({ data: null, error: null });
      }

      case "select":
      default: {
        let rows = this.applyFilters(this.state.rows);
        rows = this.applyOrder(rows);

        if (this.terminal === "maybeSingle") {
          return Promise.resolve({ data: rows.at(0) ?? null, error: null });
        }

        if (this.terminal === "single") {
          const row = rows.at(0);
          if (row === undefined) {
            return Promise.resolve({ data: null, error: { message: "No rows found" } });
          }
          return Promise.resolve({ data: this.projectRow(row), error: null });
        }

        return Promise.resolve({ data: rows.map((row) => this.projectRow(row)), error: null });
      }
    }
  }
}

export interface FakeSupabaseClient extends SupabaseClient {
  /** In-memory recipe rows for test assertions. */
  readonly _rows: RecipeRecordRow[];
}

export function createFakeSupabase(seed?: RecipeRecordRow[]): FakeSupabaseClient {
  const state: FakeState = {
    rows: seed ? structuredClone(seed) : [],
    nextId: seed?.length ?? 0,
  };

  const client = {
    from(table: string) {
      if (table !== "recipes") {
        throw new Error(`fake supabase: unsupported table "${table}"`);
      }
      return new RecipesQueryBuilder(state);
    },
    get _rows() {
      return state.rows;
    },
  };

  return client as FakeSupabaseClient;
}
