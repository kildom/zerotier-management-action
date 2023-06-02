# ZeroTier Management Action

This action should be executed after the [zerotier/github-action](https://github.com/marketplace/actions/zerotier) to manage your local and remote network members.

## Sample Usage

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
    name: 'Test Client'
    wait_for: 'Test Server'
- run: |
    echo Your address: ${{ steps.zerotier.outputs.ip }}
    echo Server address: ${{ steps.zerotier.outputs.wait_for_addresses }}
```

## Full Usage

```yaml
- uses: kildom/zerotier-management-action
  id: zerotier
  with:
    # Your ZeroTier Central API Access Token: https://my.zerotier.com/account
    auth_token: '0123456789abcdef0123456789abcdef'

    # If provided, change IPv4 and IPv6 addresses (space-separated list).
    ip: '192.168.245.101'

    # If provided, change the name.
    name: 'Test Client'

    # If provided, change the description.
    description: 'Client node on Github Action Runner'

    # If provided, change tags (space-separated list of "key=value" pairs).
    # The tags must be defined in the ZeroTier Central first.
    tags: 'location=cloud cpus=2'

    # If provided, change capabilities (space-separated list).
    # The capabilities must be defined in the ZeroTier Central first.
    capabilities: 'with_gcc with_java'

    # Name of the member that you want to wait for or a list of expressions
    # describing the members that you want to wait for. See README to learn
    # how to write an expression.
    wait_for: 'Test Server'

    # Number of minutes to wait for other members. On timeout, the action
    # will fail unless you append the "?" sign after the number. It waits
    # forever by default.
    timeout: 10

    # A number telling which IP address version should be used, "4" or "6".
    # You can append the "?" sign to allow a different version if the
    # specified version is not available, e.g. "6?" will use IPv6, if
    # available, otherwise IPv4.
    # Default: 4
    ip_version: 4

    # Invert meaning of "wait_for" input. In other words, wait until all
    # members from "wait_for" become unavailable.
    # Default: false
    wait_for_unavailable: false

    # ZeroTier Central API URL
    # Default: https://my.zerotier.com/api/v1
    api_url: 'https://my.zerotier.com/api/v1'

- run: |

    # The IP address that is assigned to the local member.
    echo ${{ steps.zerotier.outputs.ip }}

    # Address of each member that you waited for (space-separated list).
    echo ${{ steps.zerotier.outputs.wait_for_addresses }}

    # "true" or "false" indicating if a timeout occurred.
    echo ${{ steps.zerotier.outputs.timeout }}
```

In ZeroTier network, IP address availability not always guarantee that a network connection can be established immediately.
You should use other methods to check it. For example, do `ping` or check for open ports.yword. |

## Waiting for other members

The `wait_for` input allows you to wait for a network member with specified name. In many cases, this is not enough.
With the `wait_for` input, you can wait for multiple members and describe them in a very flexible way using expressions.

If you want to wait for two servers named `Storage` and `Database`, you can do: 

```yaml
wait_for: '[name=Storage] [name=Database]'
```

You can get then following `wait_for_addresses` output:

```
192.168.41.212 192.168.41.8
```

Where `192.168.41.212` is `Storage` server and `192.168.41.8` is `Database` server.

If multiple members fulfills one expression, just one of them is taken into account.
If one member fulfills multiple expressions, it will be assigned to the first expression.

If you have multiple members of the same kind, you can repeat the same expression, for example:

```yaml
wait_for: '[name^=Build server] [name^=Build server] [name^=Build server]'
```

In the `wait_for_addresses` output, you will get three IP addresses of servers which names start with `Build server`.

Detailed syntax description is in the [Expression syntax details](docs/expressions.md).
