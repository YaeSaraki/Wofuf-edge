import type {StatisticGroups} from '@M/players/dtos/StatisticGroup.ts'

export const statisticGroups: StatisticGroups = [
  {
    category: 'MOVEMENT',
    name: '移动统计',
    statistics: [
      'BOAT_ONE_CM',
      'CLIMB_ONE_CM',
      'CROUCH_ONE_CM',
      'FALL_ONE_CM',
      'FLY_ONE_CM',
      'HORSE_ONE_CM',
    ],
  },
  {
    category: 'ENTITY',
    name: '战斗统计',
    statistics: [
      'DAMAGE_ABSORBED',
      'DAMAGE_BLOCKED_BY_SHIELD',
      'DAMAGE_DEALT',
      'DAMAGE_TAKEN',
      'DEATHS',
      'ZOMBIE',
      'SKELETON',
      'CREEPER',
      'SPIDER',
    ],
  },
  {
    category: 'BLOCK',
    name: '挖掘统计',
    statistics: ['COAL_ORE', 'IRON_ORE', 'GOLD_ORE', 'DIAMOND_ORE'],
  },
  {
    category: 'ITEMS',
    name: '物品统计',
    statistics: [
      'ARMOR_CLEANED',
      'BANNER_CLEANED',
      'BELL_RING',
      'CAKE_SLICES_EATEN',
      'CLEAN_SHULKER_BOX',
      'DROP_COUNT',
      'FISH_CAUGHT',
      'ITEM_ENCHANTED',
    ],
  },
  {
    category: 'UNTYPED',
    name: '综合统计',
    statistics: ['PLAY_ONE_MINUTE', 'ANIMALS_BRED', 'CAULDRON_FILLED', 'DISPENSER_INSPECTED'],
  },
]


