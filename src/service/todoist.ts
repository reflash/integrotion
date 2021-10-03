import TodoistApiREST from "todoist-api-ts";

export const parseTask = (content: string) => {
    const text = content;
    const match = /^\*\*\[(?<type>.+)\]\*\*(?<task>[^|]+)(\|\s\[NID\]\((?<nid>.+)\))?/.exec(text);
    
    if (!match || !match.groups)
        throw new Error("No matches in item");

    const type = match.groups['type'];
    const task = match.groups['task'].trim();
    const nid = match.groups['nid'];

    return { type, task, nid };
}

export const todoist = new TodoistApiREST(process.env.TODOIST_TOKEN!); 