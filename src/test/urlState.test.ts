import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, allEnabled } from "../lib/lenses";
import { defaultState, parseState, serializeState } from "../lib/urlState";

describe("URL state", () => {
  it("default state serializes to an empty query", () => {
    expect(serializeState(defaultState())).toBe("");
  });
  it("round trips a full state", () => {
    const s = defaultState();
    s.a = 100;
    s.b = 103;
    s.rosterA = [1000, 1001, 1002, 1003, "name:new guy"];
    s.rosterB = [1015, 1016, 1017, 1018, 1019];
    s.bestOf = 5;
    s.map = "Lotus";
    s.pickedBy = "b";
    s.agentsA = ["jett", "sova", "", "omen", "killjoy"];
    s.agentsB = ["", "", "", "", "veto"];
    s.weights = { ...DEFAULT_WEIGHTS, recent_form: 40, composition: 0 };
    s.enabled = { ...allEnabled(), head_to_head: false };
    const q = serializeState(s);
    expect(parseState(q)).toEqual(s);
  });
  it("round trips through a leading question mark and URLSearchParams", () => {
    const s = defaultState();
    s.a = 5;
    s.b = 6;
    expect(parseState("?" + serializeState(s))).toEqual(s);
    expect(parseState(new URLSearchParams(serializeState(s)))).toEqual(s);
  });
  it("ignores junk", () => {
    const s = parseState("a=abc&b=-1&bo=7&pb=a&w=1,2&ra=1,2,3,4,5,6&off=99,x");
    expect(s.a).toBeNull();
    expect(s.b).toBeNull();
    expect(s.bestOf).toBe(3);
    expect(s.pickedBy).toBeNull(); // picked_by only counts with a map
    expect(s.weights).toEqual(DEFAULT_WEIGHTS);
    expect(s.rosterA).toBeNull();
    expect(s.enabled).toEqual(allEnabled());
  });
  it("keeps an incomplete lineup of 1 to 5 players", () => {
    expect(parseState("a=1&b=2&ra=11,12,name:new").rosterA).toEqual([11, 12, "name:new"]);
    expect(parseState("a=1&b=2&ra=11,11").rosterA).toBeNull();
  });
  it("omits the pick when there is no map", () => {
    const s = defaultState();
    s.pickedBy = "a";
    expect(serializeState(s)).toBe("");
  });
});
