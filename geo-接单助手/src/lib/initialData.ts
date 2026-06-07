/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeveloperTask, ConnectedAccount, CreatorOrder, TransactionRecord } from '../types';

export const INITIAL_ACCOUNTS: ConnectedAccount[] = [
  {
    id: '1',
    platform: 'xiaohongshu',
    name: '青岚咖啡探店',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-rSbGZuzXMbLwnEnovYQEwEvbklG4iRc2Vfd5WDING2sWxtkn3gmSBnCLwpzlRourHdVFr1X4R97r93AfP_LyHKm85Lk1cCnj3CkVzqsUq6os7IUjraPiOy6fqAtjtzUfhxD9mlsDrxskidMyhbrq-t4OhDR3sAxXQDOGZH86stE6h2VOGT4ujjbUhw-FOgQwaGiLP7kI6XGtFutm-uVylCcpp1RVppYrJcJTRuQURBWKbGs269K0tUb9HEUOl0kj0H_oRHEbWDw',
    followers: '12.6w',
    followersCount: 126000,
    isMain: true,
    canAccept: true,
    score: 92,
    fields: ['美食探店']
  },
  {
    id: '2',
    platform: 'zhihu',
    name: '小北的认知笔记',
    avatar: '',
    followers: '8.3w',
    followersCount: 83000,
    isMain: false,
    canAccept: true,
    score: 88,
    fields: ['数码科技', 'AI工具']
  },
  {
    id: '3',
    platform: 'official_account',
    name: '小北生活研究所',
    avatar: '',
    followers: '6.1w',
    followersCount: 61000,
    isMain: false,
    canAccept: true,
    score: 85,
    fields: ['本地生活', '家居生活']
  },
  {
    id: '4',
    platform: 'douyin',
    name: '小北探店日记',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFKa7_MbT6keLsC_P498LJfIADdw7ixEOR6cW37j5dri2Vsekoy-TEUupS3qOBjDDdxZmQI5U3dUCXyK4Jg-58WVQgTmhXbrOC9Ngehwcrbv9src2mmQsuSwY6UeyGg5y0kZQ6oLxvYjvJmL1W65L3jmN51J0sBD3_WFr2TOfg9MhkxvUKgC24jb9c0DWBPo9SI3eWcDYS1MkGalktb7MvyyCyEJbzCXt8Ns-wODQQ4UQ69ISrJCdBVxYs1Cbajp3BmZokS0ouKJaM',
    followers: '5.7w',
    followersCount: 57000,
    isMain: false,
    canAccept: false,
    score: 78,
    fields: ['本地探店']
  }
];

export const INITIAL_TASKS: DeveloperTask[] = [
  {
    id: 'task_1',
    title: '青岚咖啡探店笔记',
    platform: 'xiaohongshu',
    brand: '青岚咖啡',
    budget: 2800,
    tags: ['美食探店', '咖啡馆'],
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxoRbyuMYrpXJRpoJSuHt2fS9xH_CE0LjGhne5ShrYrLhwmOcXOK5f8RVQj1efpg5VDKIlS_MIrngouEFjroIpW4wS3RETE8asAgQZfdqaFH3ORuQcmZIlMIkqNQuK7axm-TUNTv1ujOB5_zdxd8gEf_0_Dvfrj6BEByPK3pBxf92Ibo6ooAQe-fNU-og9oLKjqpdp1I_TKXvMDh7IrZ_HdFUzg6JOaAfcaI--FNiJDMsFrnDYJLYerwMGyqEcgfQLwI3ZOwhWlJYq',
    deadline: '5 月 20 日 23:59',
    matchRate: 95,
    applicantsCount: 28
  },
  {
    id: 'task_2',
    title: '成都本地探店短视频拍摄',
    platform: 'douyin',
    brand: '川香鱼府',
    budget: 4500,
    tags: ['本地生活', '美食探店', '火锅'],
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIWVCfkM_mQj6KHVn-0p6is8OLW23Uo9Me3dXfL2ZfDYhXhU5TZ9NTaJK6U1djA74eJRLCuwdZjvkFFjcOvcmd7z9DSWK1EHqwsB5-7LQ2ANteDnKmVQ3W0bjatr1oOaC_10wBN8Q70Pi1rWeXizFhpxnz8-RPWWdEsKNKsQG0ae1V9Qg3MpeF3lhEJ8tZjM_hzKPBk35hRAYQDEwBc6vzwxkO0VRAthg3O37xkqow3_FHyQAu6q_Ngx1z3_PHoXfR5urTlHfrerO',
    deadline: '5 月 18 日 23:59',
    matchRate: 85,
    applicantsCount: 14
  },
  {
    id: 'task_3',
    title: '知乎问答覆盖任务',
    platform: 'zhihu',
    brand: '智能简捷Office',
    budget: 2000,
    tags: ['职场办公', 'AI工具'],
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxgFRhxIHznfusC88wIp-2qGLa04gqfr74ijG0cDDBvumVWAPkU9QJNfP_vuQM8omq5b4Ii1YSVmVOhkbKBPo2IXqUvNU8NoFwaFwjfVuXjUuGuZeCwCe19zf7eVz_rgi-p79EaM2MotvZHx7zMTEnZXR7LarqPuN3HD_Zf73EO5Mx-d1V8OpIvQrugrAvpjNAAmFJQx53vDwCH2O0Du_TuTMOb-VYGMmQJ3sGfk59AK9riFJOC0h3UZIxf8lS35qDxdfp69JLhpzt',
    deadline: '5 月 19 日 23:59',
    matchRate: 90,
    applicantsCount: 35
  },
  {
    id: 'task_4',
    title: '公众号软文撰写任务',
    platform: 'official_account',
    brand: '漫步居家',
    budget: 3180,
    tags: ['生活家居', '美学收纳'],
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiV2oJ8KVpZiJHcIB1n2BOeYqzDdIY0QNBQXqGiqDbxcIOPXlWSrrkU1tT-b4UEaEdI91ud8MeUaZF_tsO7jHaCXelPHI9G4lQBAuygYBoT6lse_TpfJg8u_26utjJOTSz3Wav2Bc6cJtCnw1vXX-SSdpDFow9UiGUa6d8NqtWips8S1QGeTnTEjs9yGc73k5c5sZvPjvyTq0wgArnrAAvV0mRUgfcQGGH3RoSySE5FG27c7N9wksUcbuT76fTt_ST1VGORBatjOmp',
    deadline: '5 月 22 日 23:59',
    matchRate: 82,
    applicantsCount: 19
  },
  {
    id: 'task_5',
    title: '官网内容优化任务',
    platform: 'web',
    brand: '联泰科技',
    budget: 2800,
    tags: ['数字化转型', 'IT运维'],
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcjMG9Yw1vVbVDW-JEpQx9yEGhV0i0zu4md0yBKLpAVsoqXNNqAQ-9LA9tgJSUc32kVhEJpUkuiboaKSG2VIRYXdoI-TKD5cy3Eezj_3LCR7LXZWTZoAhpFa2lSbKBD_AKzViWxFp28AhKt9txakrs_zAsVSYK5gE_9SZHePuIgVTIYvCraGApaCmy263OeFfdePsEKS-9QV9ViZEEBuvtN8x_E6t-eqRgyBGbNz8H_W8EnRUFGk5ZRVA0VJabo9nvaAUUc3hVbpOo',
    deadline: '5 月 10 日 23:59',
    matchRate: 75,
    applicantsCount: 8
  }
];

export const INITIAL_ORDERS: CreatorOrder[] = [
  {
    id: 'ORD202405160001',
    taskId: 'task_1',
    title: '青岚咖啡馆探店笔记推广',
    platform: 'xiaohongshu',
    brand: '青岚咖啡',
    budget: 2800,
    deadline: '5月20日 23:59',
    status: 'creating',
    accountId: '1',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_oEvCJQZwbKI_ElLI-vFaKmKGZ2ckV2eJCQHSejizlTgN7favKLqPK_7y77ehZJHw7ocP5ENVoegYPeSGfF_1JZ_izragtUqn74dGx1FQOOsWNQNiN1vvwesZAdbEray_jA4R0IF1wLRI0BZEsK5Rm0voEqNcPSutz1vR6PtP7FXUJ5IhQayp1lJoUJXCrheIbbywfdg0r1LkVpHPect2Cw7rG3mJhbppTk365Wdjfdieq8PZ3AulBFFGkU4PIH1T2E5pwRZT-8t-',
    deliveryDate: '2024-05-20',
    history: [
      { title: '接单成功', operator: '媒体人 小北', time: '5月16日 10:30' },
      { title: '已开始创作', operator: '媒体人 小北', time: '5月16日 13:15' }
    ],
    messages: [
      {
        id: 'm1',
        sender: 'brand',
        senderName: '青岚咖啡',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzxR85IriuarzrEpoEnB--G6LqsANVZn5_bCvbWANsX3kT8-2jUjLOWRAo6Rw9mSM7Q-Oy2viKc-ufAVsX_qhPnq8pjMdVUUrysgfrdEgxGrBvNeqyzZD11mbR7KujHh7TvSOR1XviU58pl_S50DdlKjdQqFOOBQ1FacoI9zzMAIPv4mdMzO6FlHPqAExF8Q_YJhszJmeap62j3Y3SuiVXckezZqdw1QKDwwktnOQuQb7W_2P0tzvctY7-fsSqrPag2frl1CKDOD-K',
        time: '5月16日 11:20',
        content: '建议突出咖啡口感和环境氛围，还有甜品哦～'
      },
      {
        id: 'm2',
        sender: 'creator',
        senderName: '媒体人 小北',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmEParQjPu9u7quE9pTXTLVwMFAJhrxSL3T_Br2EZe-Bfuija9UNzkYzPEcqdzn42u8mvPwK5G_lPqv3P187pyWATWWAXMmClA5XGNiKy_Yo4gEC5SjJj4bTtYYUzcKpWVXevjk795fAPgGFPnp-SmDrceZ_jXend26FtlxLEMVeCdsp258C6VvWcQd-gQmNLTQ6vRnBeKhe0ailErPn6GEkxXmMSevuc8lUnvbbEE03ra-6Evgc2bdGc5ZuT2iQTfQ7JvgqEuUw9U',
        time: '5月16日 11:35',
        content: '收到，好的，我会在文案中重点呈现。'
      }
    ]
  },
  {
    id: 'ORD202405150097',
    taskId: 'task_2',
    title: '成都本地探店短视频拍摄',
    platform: 'douyin',
    brand: '川香鱼府',
    budget: 4500,
    deadline: '5月18日 23:59',
    status: 'creating',
    accountId: '4',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIWVCfkM_mQj6KHVn-0p6is8OLW23Uo9Me3dXfL2ZfDYhXhU5TZ9NTaJK6U1djA74eJRLCuwdZjvkFFjcOvcmd7z9DSWK1EHqwsB5-7LQ2ANteDnKmVQ3W0bjatr1oOaC_10wBN8Q70Pi1rWeXizFhpxnz8-RPWWdEsKNKsQG0ae1V9Qg3MpeF3lhEJ8tZjM_hzKPBk35hRAYQDEwBc6vzwxkO0VRAthg3O37xkqow3_FHyQAu6q_Ngx1z3_PHoXfR5urTlHfrerO',
    deliveryDate: '2024-05-18',
    history: [
      { title: '接单成功', operator: '媒体人 小北', time: '5月15日 09:30' },
      { title: '已开始创作', operator: '媒体人 小北', time: '5月15日 14:00' }
    ],
    messages: []
  },
  {
    id: 'ORD202405140055',
    taskId: 'task_3',
    title: '知乎问答覆盖任务',
    platform: 'zhihu',
    brand: '智能简捷Office',
    budget: 2000,
    deadline: '5月19日 23:59',
    status: 'checking',
    accountId: '2',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxgFRhxIHznfusC88wIp-2qGLa04gqfr74ijG0cDDBvumVWAPkU9QJNfP_vuQM8omq5b4Ii1YSVmVOhkbKBPo2IXqUvNU8NoFwaFwjfVuXjUuGuZeCwCe19zf7eVz_rgi-p79EaM2MotvZHx7zMTEnZXR7LarqPuN3HD_Zf73EO5Mx-d1V8OpIvQrugrAvpjNAAmFJQx53vDwCH2O0Du_TuTMOb-VYGMmQJ3sGfk59AK9riFJOC0h3UZIxf8lS35qDxdfp69JLhpzt',
    deliveryDate: '2024-05-19',
    history: [
      { title: '接单成功', operator: '媒体人 小北', time: '5月14日 10:15' },
      { title: '已开始创作', operator: '媒体人 小北', time: '5月14日 12:45' },
      { title: '提交验收', operator: '媒体人 小北', time: '5月17日 18:20' }
    ],
    messages: []
  },
  {
    id: 'ORD202405120032',
    taskId: 'task_4',
    title: '公众号软文撰写任务',
    platform: 'official_account',
    brand: '漫步居家',
    budget: 3180,
    deadline: '5月22日 23:59',
    status: 'applying',
    accountId: '3',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiV2oJ8KVpZiJHcIB1n2BOeYqzDdIY0QNBQXqGiqDbxcIOPXlWSrrkU1tT-b4UEaEdI91ud8MeUaZF_tsO7jHaCXelPHI9G4lQBAuygYBoT6lse_TpfJg8u_26utjJOTSz3Wav2Bc6cJtCnw1vXX-SSdpDFow9UiGUa6d8NqtWips8S1QGeTnTEjs9yGc73k5c5sZvPjvyTq0wgArnrAAvV0mRUgfcQGGH3RoSySE5FG27c7N9wksUcbuT76fTt_ST1VGORBatjOmp',
    deliveryDate: '2024-05-22',
    history: [
      { title: '申请任务中', operator: '媒体人 小北', time: '5月12日 14:20' }
    ],
    messages: []
  },
  {
    id: 'ORD202405100002',
    taskId: 'task_5',
    title: '官网内容优化任务',
    platform: 'web',
    brand: '联泰科技',
    budget: 2800,
    deadline: '5月10日 23:59',
    status: 'settled',
    accountId: '3',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcjMG9Yw1vVbVDW-JEpQx9yEGhV0i0zu4md0yBKLpAVsoqXNNqAQ-9LA9tgJSUc32kVhEJpUkuiboaKSG2VIRYXdoI-TKD5cy3Eezj_3LCR7LXZWTZoAhpFa2lSbKBD_AKzViWxFp28AhKt9txakrs_zAsVSYK5gE_9SZHePuIgVTIYvCraGApaCmy263OeFfdePsEKS-9QV9ViZEEBuvtN8x_E6t-eqRgyBGbNz8H_W8EnRUFGk5ZRVA0VJabo9nvaAUUc3hVbpOo',
    deliveryDate: '2024-05-08',
    history: [
      { title: '接单成功', operator: '媒体人 小北', time: '5月2 日 10:00' },
      { title: '已开始创作', operator: '媒体人 小北', time: '5月2 日 14:00' },
      { title: '提交验收', operator: '媒体人 小北', time: '5月6 日 11:20' },
      { title: '结算打款成功', operator: '平台系统', time: '5月10日 10:30' }
    ],
    messages: []
  }
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TRANS_1',
    taskId: 'task_1',
    title: '小红书种草笔记 | 青岚咖啡新品推广',
    orderId: 'ORD202405160001',
    type: 'income',
    status: 'settled',
    amount: 2800,
    time: '2024-05-20 10:30',
    platform: 'xiaohongshu'
  },
  {
    id: 'TRANS_2',
    taskId: 'task_2',
    title: '成都火锅探店短视频',
    orderId: 'ORD202405150097',
    type: 'income',
    status: 'settled',
    amount: 4500,
    time: '2024-05-18 16:20',
    platform: 'douyin'
  },
  {
    id: 'TRANS_3',
    taskId: 'task_3',
    title: '知乎问答覆盖 | AI 办公工具推荐',
    orderId: 'ORD202405140055',
    type: 'income',
    status: 'pending',
    amount: 2000,
    time: '2024-05-19 09:15',
    platform: 'zhihu'
  },
  {
    id: 'TRANS_4',
    taskId: 'task_4',
    title: '公众号软文撰写 | 家居收纳技巧',
    orderId: 'ORD202405120032',
    type: 'income',
    status: 'settled',
    amount: 3180,
    time: '2024-05-15 11:20',
    platform: 'official_account'
  },
  {
    id: 'TRANS_5',
    title: '提现到 招商银行 (尾号 6688)',
    type: 'withdrawal',
    status: 'success',
    amount: 2000,
    time: '2024-05-12 14:45'
  }
];
