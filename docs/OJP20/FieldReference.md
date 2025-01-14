# XML Fields

Based in this https://opentransportdata.swiss/de/cookbook/ojpstopeventrequest/#Request

## Request

| Field                                               | Value   | Meaning                                                              |
|-----------------------------------------------------|---------|----------------------------------------------------------------------|
| `<StopPlaceRef>`                                    | 8507000 | Bern                                                                 |
| `<siri:OperatorRef></siri:OperatorRef>`             | 11      | SBB                                                                  |
| `<OperatorFilter>`                                  |         | Seems to include the given operator                                  | 
| `<NumberOfResults>5</NumberOfResults>`              |         | Number of Results. Limit is unclear, 50 takes long but seems to work | 
| `<IncludePreviousCalls>true</IncludePreviousCalls>` | true    | Include previous stops                                               |
| `<IncludeOnwardCalls>true</IncludeOnwardCalls>`     | true    | Include next stops                                                   |
| `<UseRealtimeData>full</UseRealtimeData>`           | true    | Include Realtime Information                                         |

This seems to include the given operator (SBB)

```xml

<OperatorFilter>
    <Exclude>false</Exclude>
    <OperatorRef>11</OperatorRef>
</OperatorFilter>
```

This seems to be the needed Request params:
```xml
<Params>
    <NumberOfResults>100</NumberOfResults>
    <StopEventType>both</StopEventType>
    <IncludePreviousCalls>true</IncludePreviousCalls>
    <IncludeOnwardCalls>true</IncludeOnwardCalls>
    <UseRealtimeData>full</UseRealtimeData>
</Params>
```