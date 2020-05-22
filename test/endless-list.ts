import { Client, Provider, ProviderRegistry, Result, Receipt } from "@blockstack/clarity";
import { assert } from "chai";

const contractSignature = "SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB";
const aliceSignature = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"

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

function unwrapIntArray(receipt: Receipt): number[]{
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

describe("redistribution contract test suite", () => {
  let client: Client;
  let provider: Provider;
  before(async () => {
    provider = await ProviderRegistry.createProvider();
    client = new Client(contractSignature + ".redistribution", "redistribution", provider);
  });
  it("should have a valid syntax", async () => {
    await client.checkContract();
  });
  describe("deploying an instance of the contract", () => {
    let reciept: Receipt;
    before(async () => {
      reciept = await client.deployContract();
    });

    it("should succeed", () => {
      assert.isTrue(reciept.success)
    })
  });

  describe("when adding a item", () => {
    let reciept: Receipt;
    before(async () => {
      reciept = await execMethod(client, aliceSignature, "add-item", ["1"])
    });

    it("should succeed", () => {
      assert.isTrue(reciept.success)
    })

    it("should have one item in the current list", async () => {
      let result = await getCurrentList(client)
      assert.equal(result.length, 1)
      assert.equal(result[0], 1)
    })

    it("should be on page 0", async () => {
      let result = await getCurrentPage(client);
      assert.equal(result, 0)
    })
  })

  describe("when getting a list id that doesn't exist", () => {
    let result: ListMap;
    before(async () => {
      result = await getitemMap(client, 10)
    })

    it("should return null", () => {
      assert.isNull(result)
    })
  })

  describe("when adding 10 items", () => {
    before(async () => {
      for(let i = 0; i <= 10; i++){
        await execMethod(client, aliceSignature, "add-item", ["2"])
      }
    })

    it("should be on page 1", async () => {
      let result = await getCurrentPage(client);
      assert.equal(result, 1)
    })

    it("should list 10 people on page 0", async () => {
      let result = await getitemMap(client, 0);
      assert.equal(result.items.length, 10)
    })

    it("should list page 1 as the next page", async () => {
      let result = await getitemMap(client, 0);
      assert.equal(result.next, 1)
    })
  })

  describe("when adding 50 items", () => {
    before(async () => {
      for(let i = 0; i <= 50; i++){
        await execMethod(client, aliceSignature, "add-item", ["3"])
      }
    })

    it("should be on page 6", async () => {
      let result = await getCurrentPage(client);
      assert.equal(result, 6)
    })
  })

  describe("when walking the list", () => {
    let result = []

    before(async () => {
      let itemMap = await getitemMap(client, 0)
      while(itemMap != null){
        result = result.concat(itemMap.items)
        itemMap = await getitemMap(client, itemMap.next)
      }
    })

    it("should return everything", () => {
      assert.equal(result.length, 63)
    })
  })

  after(async () => {
    await provider.close();
  });
});
