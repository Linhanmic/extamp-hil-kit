import { describe, expect, it } from 'vitest'
import type { Configuration, Requirement } from '@/models'
import {
  analyzeRequirementAssociation,
  missingRequirementNames,
} from '../requirement-association'

function requirement(...keys: string[]): Requirement {
  return {
    id: 'REQ_1',
    name: '媒体音源控制',
    detail: '',
    variants: keys.map((key) => ({
      requirement_id: 'REQ_1',
      key,
      content: [key || '无差异'],
      vehicles: ['HFAF'],
    })),
  }
}

function configurations(...keys: string[]): Configuration[] {
  return [
    {
      config_key: '媒体音源默认值',
      config_value: [
        {
          config_key: '媒体音源默认值',
          value: '0x0无音源',
          relay_variants: keys.map((variant_key) => ({
            requirement_name: '媒体音源控制',
            variant_key,
          })),
          special_vehicles: [],
        },
      ],
    },
  ]
}

describe('analyzeRequirementAssociation', () => {
  it('全部未关联且无失效引用时为未关联', () => {
    expect(analyzeRequirementAssociation(requirement('a', 'b'), [])).toMatchObject({
      status: 'unlinked',
      linkedKeys: [],
      unlinkedKeys: ['a', 'b'],
      staleKeys: [],
    })
  })

  it('部分当前变体未关联时为变体增加', () => {
    expect(analyzeRequirementAssociation(requirement('a', 'b'), configurations('a')).status).toBe(
      'variant_added',
    )
  })

  it('仅存在失效变体引用时为变体删除', () => {
    expect(analyzeRequirementAssociation(requirement('a'), configurations('a', 'old')).status).toBe(
      'variant_removed',
    )
  })

  it('新增未关联与失效引用同时存在时为变体变更', () => {
    expect(
      analyzeRequirementAssociation(requirement('a', 'b'), configurations('a', 'old')),
    ).toMatchObject({
      status: 'variant_changed',
      linkedKeys: ['a'],
      unlinkedKeys: ['b'],
      staleKeys: ['old'],
    })
  })

  it('全部当前变体已关联且无失效引用时为正常', () => {
    expect(analyzeRequirementAssociation(requirement('a', 'b'), configurations('a', 'b')).status).toBe(
      'normal',
    )
  })

  it('不参与处理时无论实际关联情况都显示正常', () => {
    expect(
      analyzeRequirementAssociation(requirement('a', 'b'), configurations('old'), false).status,
    ).toBe('normal')
  })
})

describe('missingRequirementNames', () => {
  it('配置值引用已不存在的需求时按名称去重列出', () => {
    const orphan: Configuration[] = [
      {
        config_key: '示例',
        config_value: [
          {
            config_key: '示例',
            value: '值',
            relay_variants: [
              { requirement_name: '已删除需求', variant_key: 'a' },
              { requirement_name: '已删除需求', variant_key: 'b' },
            ],
            special_vehicles: [],
          },
        ],
      },
    ]
    expect(missingRequirementNames([requirement('a')], [...configurations('a'), ...orphan])).toEqual([
      '已删除需求',
    ])
  })
})
