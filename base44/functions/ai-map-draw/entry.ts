import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SYSTEM = `You are a cadastral map drawing assistant for a Pakistani irrigation map. You help the user draw "mustateel" (rectangular land parcels), a "canal" (watercourse along the top/bottom of mustateels), and a "chakbandi" (boundary line enclosing a group of mustateels) via a step-by-step Q&A in Roman Urdu.
Ask ONE clear question at a time. Gather this information:
1. FIRST mustateel line: start number, end number, and direction (left-to-right = "ltr", or right-to-left = "rtl").
2. EACH further line: which direction, numbering start-end, and which mustateel number it must start BELOW (e.g. below 855).
3. CANAL: which mustateel numbers the canal runs along, and whether along their top or bottom edge.
4. CHAKBANDI: which mustateel numbers the chakbandi boundary should enclose.
If the user gives partial info, fill reasonable defaults and ask only what is missing. Keep questions short.
When you have enough information, set "done": true and fill "spec". Otherwise "done": false and use "reply" to ask the next question.
spec shape:
- lines: array of { "start": number, "end": number, "below": number|null, "direction": "ltr"|"rtl" }. "below" is the mustateel NUMBER this line starts directly under; null/omit for the first line.
- canal: { "through": [mustateel numbers], "side": "top"|"bottom" }
- chakbandi: { "around": [mustateel numbers] }
Example final answer:
{ "reply": "نقشہ تیار ہے، اب ڈرائی کر رہا ہوں۔", "done": true, "spec": { "lines": [{"start":1,"end":15,"below":null,"direction":"ltr"},{"start":16,"end":30,"below":15,"direction":"rtl"}], "canal": {"through":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"side":"top"}, "chakbandi": {"around":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]} } }`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { conversation } = await req.json();
    if (!conversation) return Response.json({ error: 'conversation required' }, { status: 400 });

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM}\n\nConversation so far:\n${conversation}\n\nNow respond according to the rules.`,
      response_json_schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          done: { type: "boolean" },
          spec: {
            type: "object",
            properties: {
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    start: { type: "number" },
                    end: { type: "number" },
                    below: { type: ["number", "null"] },
                    direction: { type: "string", enum: ["ltr", "rtl"] },
                  },
                  required: ["start", "end", "direction"],
                },
              },
              canal: {
                type: "object",
                properties: {
                  through: { type: "array", items: { type: "number" } },
                  side: { type: "string", enum: ["top", "bottom"] },
                },
              },
              chakbandi: {
                type: "object",
                properties: { around: { type: "array", items: { type: "number" } } },
              },
            },
          },
        },
        required: ["reply", "done"],
      },
    });
    return Response.json(res);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}