import { Client, Result, Receipt } from "@blockstack/clarity";

interface ListMap {
    items: number[]
    next: number
}

function unwrapListMap(receipt: Receipt): ListMap {
    let tuple = receipt.result;
    const nextMatches = tuple.match(/(\(next )(\d+)/)
    const next = parseInt(nextMatches[2]);
    const itemMatches = tuple.match(/\(items \(([^\)]+)\)/)[1]
    const itemStrings = itemMatches.split(" ");
    const items = []
    itemStrings.forEach(element => {
        items.push(parseInt(element))
    });
    return { items, next };
}

function unwrapIntArray(receipt: Receipt): number[] {
    const itemMatches = receipt.result.match(/\(ok \(([^\)]+)\)/)[1]
    const itemStrings = itemMatches.split(" ");
    const items = []
    itemStrings.forEach(element => {
        items.push(parseInt(element))
    });
    return items;
}

async function runQuery(client: Client, method: string, args: string[] = []) {
    const query = client.createQuery({
        method: { name: method, args }
    });

    return await client.submitQuery(query);
}

const getCurrentPage = async (client: Client) => {
    let receipt = await runQuery(client, "get-current-page")
    const result = Result.unwrapInt(receipt);
    return result;
}

async function getCurrentList(client: Client): Promise<number[]> {
    let receipt = await runQuery(client, "get-current-list")
    return unwrapIntArray(receipt)
}

async function getitemMap(client: Client, page: number): Promise<ListMap> {
    try {
        let receipt = await runQuery(client, "get-items-map-at-page", [page.toString()])
        return unwrapListMap(receipt)
    } catch (ex) {
        return null
    }
}

const execMethod = async (client: Client, signature: string, method: string, args: string[]) => {
    const tx = client.createTransaction({
        method: {
            name: method,
            args,
        },
    });
    await tx.sign(signature);
    const receipt = await client.submitTransaction(tx);
    return receipt;
}

export { ListMap, getCurrentPage, getCurrentList, getitemMap, execMethod }
