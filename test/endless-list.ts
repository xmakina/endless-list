import { Client, Provider, ProviderRegistry, Result, Receipt } from "@blockstack/clarity";
import { assert } from "chai";
import { ListMap, getCurrentPage, getCurrentList, getitemMap, execMethod } from "./helper-functions"

const contractSignature = "SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB";
const userSignature = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"

describe("endless-list contract test suite", () => {
  let client: Client;
  let provider: Provider;
  before(async () => {
    provider = await ProviderRegistry.createProvider();
    client = new Client(contractSignature + ".endless-list", "endless-list", provider);
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

  describe("when checking security measures", () => {


    describe("when not allowed to add an item", () => {
      let reciept: Receipt;
      before(async () => {
        reciept = await execMethod(client, userSignature, "add-item", ["1"])
      });

      it("should fail", () => {
        assert.isFalse(reciept.success)
      })
    })

    describe("when not allowed to hand over control", () => {
      let reciept: Receipt;
      before(async () => {
        reciept = await execMethod(client, userSignature, "update-allowed-user", ["'" + userSignature])
      });

      it("should fail", () => {
        assert.isFalse(reciept.success)
      })
    })

    describe("when handing over allowed user", () => {
      let reciept: Receipt;
      before(async () => {
        reciept = await execMethod(client, contractSignature, "update-allowed-user", ["'" + userSignature])
      });

      it("should succeed", () => {
        assert.isTrue(reciept.success)
      })
    })
  })

  describe("when adding a item", () => {
    let reciept: Receipt;
    before(async () => {
      reciept = await execMethod(client, userSignature, "add-item", ["1"])
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

  describe("when adding 50 items", () => {
    before(async () => {
      for (let i = 0; i <= 50; i++) {
        await execMethod(client, userSignature, "add-item", ["3"])
      }
    })

    it("should be on page 5", async () => {
      let result = await getCurrentPage(client);
      assert.equal(result, 5)
    })
  })

  describe("when walking the list", () => {
    let result = []

    before(async () => {
      let itemMap = await getitemMap(client, 0)
      while (itemMap != null) {
        result = result.concat(itemMap.items)
        itemMap = await getitemMap(client, itemMap.next)
      }
    })

    it("should return everything", () => {
      assert.equal(result.length, 52)
    })
  })

  after(async () => {
    await provider.close();
  });
});
