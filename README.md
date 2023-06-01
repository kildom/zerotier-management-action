# ZeroTier Management Action

This Action is designed to work after the [zerotier/github-action](https://github.com/marketplace/actions/zerotier).
The *ZeroTier Management Action* can adjust a local network member configuration and wait for the others to be ready.

```yaml
- uses: zerotier/github-action@v1.0.1
  with:
    network_id: ${{ secrets.ZEROTIER_NETWORK_ID }}
    auth_token: ${{ secrets.ZEROTIER_CENTRAL_TOKEN }}
- uses: kildom/zerotier-management-action
  id: zerotier
  with:
    auth_token: ${{ secrets.ZEROTIER_CENTRAL_TOKEN }}
    ip: '192.168.43.210'
    name: 'test_client'
    wait_for: '[name=test_server]'
- run: |
    echo Your address: ${{ steps.zerotier.outputs.ip }}
    echo Server address: ${{ steps.zerotier.outputs.wait_for_addresses }}
```

## How it works

The Action:

 1. changes local ZeroTier-One network member configuration using values provided in the action inputs.
 1. waits for other network members to be ready, which means that:
    * member is online,
    * member IP address is available,
    * member fulfils conditions contained in the `wait_for` input.
 1. waits for local IP address to be:
    * available,
    * updated to new value if `ip` input was provided.

Above conditions not always guarantee that a network connection can be established immediately.
You should use other methods to check it. For example, do `ping` or check open ports.

## Setting local node configuration

You can set the local node configuration with following inputs.
New values will overwrite the old ones.
If you skip any of the option, it will be unchanged.

| Input name | Type | Description |
|-|-|-|
| `name` | string | Name |
| `description` | string | Description |
| `ip` | space-separated list | IPv4 and IPv6 addresses that will be assigned to local node. Old addresses will be overridden. |
| `capabilities` | space-separated list | You can use name or numeric id of the capability. Capabilities must be defined in the *Flow Rules* with the `cap` keyword. |
| `tags` | space-separated list of `key=value` items | You can use name or numeric id of the both key and value. Tags must be defined in the *Flow Rules* with the `tag` keyword. |

## Waiting for other nodes

You can wait for one or more nodes.
The `wait_for` input contains a flexible expression that describes nodes that you wish to wait for.
As a result, you will get space-separated list of IP addresses in the `wait_for_addresses` output that matches `wait_for` list.

If you want to wait for two servers named `Storage` and `Database`, you can do: 

```yaml
wait_for: '[name=Storage] [name=Database]'
```

As an example, you will get following `wait_for_addresses` output:

```
192.168.41.212 192.168.41.8
```

Where `192.168.41.212` is storage server and `192.168.41.8` is database server.

If multiple nodes fulfills one expression, just one of them is taken into account.
If one node fulfills multiple expressions, it will be assigned to the first expression.

If you have multiple nodes of the same kind, you can repeat the same expression, for example:

```yaml
wait_for: '[name^=Build server] [name^=Build server] [name^=Build server]'
```

As a result, you will get IP addresses of three server with name starting with `Build server`.

Detailed syntax description is in the [Expression syntax details](docs/selectors.md).
