from ninja import Schema


class DataQualitySample(Schema):
    kind: str
    id: int
    label: str


class DataQualityCheck(Schema):
    key: str
    title: str
    description: str
    count: int
    samples: list[DataQualitySample]
