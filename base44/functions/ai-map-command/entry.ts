import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SYSTEM_PROMPT = `You are a GIS command parser for a Pakistani cadastral (chakbandi) mapping system.
Parse the user's natural language commands into a structured JSON array of actions.
Supported actions:
1. create_mustateels — Create numbered mustateel (land parcel) blocks in a grid.
   Extract start and end numbers from phrases like "draw mustateel 5531 to 5539".
   Fields: {action:"create_mustateels", start:<number>, end:<number>, mogaNumber:"<optional>"}
2. draw_chakbandi — Draw chakbandi boundary cross-mark lines around mustateel edges.
   Fields: {action:"draw_chakbandi", mogaNumber:"<optional>", name:"<optional>"}
3. draw_mouza — Draw mouza (village) boundary around all mustateels.
   Fields: {action:"draw_mouza"}
4. draw_canal — Draw main canal. Extract direction and position.
   Fields: {action:"draw_canal", direction:"horizontal"|"vertical", position:"top"|"bottom"|"left"|"right", name:"<optional>"}
5. draw_khal — Draw khal (minor canal / distributary).
   Fields: {action:"draw_khal", position:"top"|"bottom"}
6. draw_road — Draw road.
   Fields: {action:"draw_road", position:"top"|"bottom"}
7. place_moga — Place moga (outlet) on the canal. Extract number and side (L/R).
   Example: "moga 13223 R" → {action:"place_moga", number:"13223", side:"R"}
8. label_acres — Set acreage label on a specific mustateel.
   Fields: {action:"label_acres", mustateelNumber:<number>, acres:<number>, outOfMouza:<number optional>}
Rules:
- Parse each line or sentence as a separate command.
- If a command doesn't match any action, skip it.
- Default direction for canal is "horizontal", default position is "top".
- Default side for moga is "R".
- Return ONLY a JSON object: {"commands":[...]}`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { command, objectCount } = await req.json();
    if (!command) return Response.json({ error: 'command required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}

Current map has ${objectCount || 0} object(s).

User commands:
"""
${command}
"""`,
      response_json_schema: {
        type: "object",
        properties: {
          commands: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["create_mustateels","draw_chakbandi","draw_mouza","draw_canal","draw_khal","draw_road","place_moga","label_acres"] },
                start: { type: "number" },
                end: { type: "number" },
                mogaNumber: { type: "string" },
                name: { type: "string" },
                direction: { type: "string", enum: ["horizontal","vertical"] },
                position: { type: "string", enum: ["top","bottom","left","right"] },
                number: { type: "string" },
                side: { type: "string", enum: ["L","R"] },
                mustateelNumber: { type: "number" },
                acres: { type: "number" },
                outOfMouza: { type: "number" },
              },
              required: ["action"],
            },
          },
        },
        required: ["commands"],
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}