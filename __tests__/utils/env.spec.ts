import { afterEach, describe, expect, it } from "vitest";
import { getDisabledTools, getVisRequestServer } from "../../src/utils/env";

describe("env", () => {
  it("default vis request server", () => {
    expect(() => getVisRequestServer()).toThrow(
      "VIS_REQUEST_SERVER environment variable is not set",
    );
  });

  it("modify vis request server by env", () => {
    process.env.VIS_REQUEST_SERVER = "https://example.com/api/gpt-vis";
    expect(getVisRequestServer()).toBe("https://example.com/api/gpt-vis");
  });

  it("default disabled tools", () => {
    process.env.DISABLED_TOOLS = undefined;
    expect(getDisabledTools()).toEqual([]);
  });

  it("parse disabled tools from env", () => {
    process.env.DISABLED_TOOLS = "generate_fishbone_diagram,generate_mind_map";
    expect(getDisabledTools()).toEqual([
      "generate_fishbone_diagram",
      "generate_mind_map",
    ]);
  });

  it("handle empty disabled tools env", () => {
    process.env.DISABLED_TOOLS = "";
    expect(getDisabledTools()).toEqual([]);
  });

  afterEach(() => {
    process.env.VIS_REQUEST_SERVER = undefined;
    process.env.DISABLED_TOOLS = undefined;
  });
});
