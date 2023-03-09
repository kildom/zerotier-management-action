# ZeroTier Constant Identity Action

This Action creates a connection to your ZeroTier-One network.
It uses an identity from inputs instead of generating new one each time.

If you prefer to run an action with new a identity each time,
see a different action:
[zerotier/github-action](https://github.com/marketplace/actions/zerotier).

## Usage
```yaml
- uses: kildom/zerotier-const-id-action
  id: zerotier
  with:
    network-id: ${{ secrets.NETWORK_ID }}
    identity: ${{ secrets.IDENTITY }}
- run: |
    echo Your ZeroTier IP address is:
    echo ${{ steps.zerotier.outputs.ip }}
```

The **`identity`** input is a private key that can be generated with
[on-line generator](https://kildom.github.io/zerotier-const-id-action/) or with `zerotier-idtool` command.

## Constant identity benefits

* Constant IP and MAC addresses.
* New nodes have to be authorized only once in the [ZeroTier Central](https://my.zerotier.com/) admin panel.
* Your ZeroTier Central is not floated with new nodes.

## Constant identity limitations

* Only one job with the same identity can run at a time.
  You have to ensure this when creating or starting workflows.
  Example solutions:
   * You can use [`concurrency`](https://docs.github.com/en/actions/using-jobs/using-concurrency).
   * You can have different identities for different jobs.
   * You can have pool of identities.
* 