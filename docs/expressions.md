# Expression syntax details

The expression is a single selector or multiple selectors combined with the operators.

Examples of selectors:
 * `[name^=Server]` - name starts with `Server` (case insensitive)
 * `[IPv4Address$=.123]` - IPv4 address ends with `.123`
 * `[IPv6Address!=]` - IPv6 address is not empty
 * `[capabilities~=secure]` - member has `secure` capability set
 * `[tag:os=Linux]` - member has `os` tag set to `Linux`
 * `[description*=Exclude from CI]` - member description contains `Exclude from CI`

Examples selectors with operators:
 * `NOT [description*=Exclude from CI]` - member description does not contain `Exclude from CI`
 * `[address$=.123] OR [address$=:0123]` - address ends with `.123` or `:0123`
 * `NOT ([name==Server] OR [name==Host])` - name is neither `Server` nor `Host`

If entire input contains one expression and that expression contains one selector, then
`[` and `]` signs may be skipped, e.g. `name=Server` is the same as `[name=Server]`.

## Selector syntax

Selectors are inspired by the [CSS Attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors).

Selectors are case-insensitive.

| Selector syntax | Description |
|-|-|
| `[attr=value]` or `[attr==value]` | Represents members whose attribute is exactly `value` |
| `[attr!=value]` | Represents members whose attribute is different than `value` |
| `[attr~=value]` | Represents members whose attribute contain word `value` (words are whitespace-separated) |
| `[attr^=value]` | Represents members whose attribute starts with `value` |
| `[attr$=value]` | Represents members whose attribute ends with `value` |
| `[attr*=value]` | Represents members whose attribute contains `value` |
| `[attr/=pattern]` | Represents members whose attribute matches regexp `pattern` |
| `[attr?=expression]` | Represents members whose attribute matches JavaScript `expression`. `$` is a JS variable containing the attribute, `$$` is an object holding all the attributes. |


## Selector attributes

The members has following attributes.

Undefined or unknown attribute are represented by an empty string.

| Attribute name | Description |
|-|-|
| `name` | Name of the member |
| `description` | Description of the member |
| `address` | IPv4 or IPv6 address (depends on `ip_version` input) |
| `IPv4Address` | IPv4 address |
| `IPv6Address` | IPv6 address |
| `nodeId` | 10-digit node ID (address) |
| `capabilities` | Space-separated list of member capabilities. It contains both name and numeric representation of each capability. |
| `tag:NNN` | Numeric representation of value of tag number `NNN` |
| `tag:abc` | Numeric representation of value of tag named `abc` |
| `tagEnum:NNN` | Enum item name of tag number `NNN` |
| `tagEnum:abc` | Enum item name of tag named `abc` |
| `identity` | Public member identity |

## Operators

Operators do usual boolean operations:

| Operator syntax | Description | Precedence |
|-|-|-|
| `NOT` | Logic *NOT* | 1 |
| `AND` | Logic *AND* | 2 |
| `OR` | Logic *OR* | 3 |
| `( ... )` | Parentheses | - |
