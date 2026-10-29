import type {AdvancementGroups} from '@M/players/dtos/AdvancementGroup.ts'

// Minecraft 成就分组配置（不包含配方）
export const advancementsGroups: AdvancementGroups = [
  {
    category: 'STORY',
    name: 'STORY',
    advancements: [
      'story/root',
      'story/mine_stone',
      'story/upgrade_tools',
      'story/smelt_iron',
      'story/iron_tools',
      'story/lava_bucket',
      'story/obtain_armor',
      'story/mine_diamond',
      'story/form_obsidian',
      'story/deflect_arrow',
      'story/enchant_item',
      'story/shiny_gear',
      'story/enter_the_nether',
      'story/cure_zombie_villager',
      'story/follow_ender_eye',
      'story/enter_the_end',
    ],
  },
  {
    category: 'ADVENTURE',
    name: 'ADVENTURE',
    advancements: [
      'adventure/root', // 冒险 Adventure
      'adventure/avoid_vibration', // 潜行100级 Sneak 100
      'adventure/crafters_crafting_crafters', // 合成器合成合成器 Crafters Crafting Crafters
      'adventure/fall_from_world_height', // 上天入地 Caves & Cliffs
      'adventure/heart_transplanter', // 移心接木 Heart Transplanter
      'adventure/honey_block_slide', // 胶着状态 Sticky Situation
      'adventure/kill_a_mob', // 怪物猎人 Monster Hunter
      'adventure/lightning_rod_with_villager_no_fire', // 电涌保护器 Surge Protector
      'adventure/minecraft_trials_edition', // Minecraft：试炼版 Minecraft: Trial(s) Edition
      'adventure/ol_betsy', // 扣下悬刀 Ol' Betsy
      'adventure/read_power_of_chiseled_bookshelf', // 知识就是力量 The Power of Books
      'adventure/brush_armadillo', // 这不是鳞甲么？ Isn't It Scute?
      'adventure/salvage_sherd', // 探古寻源 Respecting the Remnants
      'adventure/sleep_in_bed', // 甜蜜的梦 Sweet Dreams
      'adventure/spyglass_at_parrot', // 那是鸟吗？ Is It a Bird?
      'adventure/trade', // 成交！ What a Deal!
      'adventure/trim_with_any_armor_pattern', // 旧貌锻新颜 Crafting a New Look
      'adventure/voluntary_exile', // 自我放逐 Voluntary Exile
      'adventure/use_lodestone', // 天涯共此石 Country Lode, Take Me Home
      'adventure/kill_all_mobs', // 资深怪物猎人 Monsters Hunted（需要前置：adventure/kill_a_mob）
      'adventure/kill_mob_near_sculk_catalyst', // 它蔓延了 It Spreads（需要前置：adventure/kill_a_mob）
      'adventure/shoot_arrow', // 瞄准目标 Take Aim（需要前置：adventure/kill_a_mob）
      'adventure/throw_trident', // 抖包袱 A Throwaway Joke（需要前置：adventure/kill_a_mob）
      'adventure/totem_of_undying', // 超越生死 Postmortal（需要前置：adventure/kill_a_mob）
      'adventure/spear_many_mobs', // 生物串串香 Mob Kabob（需要前置：adventure/kill_a_mob）
      'adventure/blowback', // 逆风翻盘 Blowback（需要前置：adventure/minecraft_trials_edition）
      'adventure/lighten_up', // 铜光焕发 Lighten Up（需要前置：adventure/minecraft_trials_edition）
      'adventure/overoverkill', // 天赐良击 Over-Overkill（需要前置：adventure/minecraft_trials_edition）
      'adventure/under_lock_and_key', // 珍藏密敛 Under Lock and Key（需要前置：adventure/minecraft_trials_edition）
      'adventure/who_needs_rockets', // 还要啥火箭啊？ Who Needs Rockets?（需要前置：adventure/minecraft_trials_edition）
      'adventure/arbalistic', // 劲弩手 Arbalistic（需要前置：adventure/ol_betsy）
      'adventure/two_birds_one_arrow', // 一箭双雕 Two Birds, One Arrow（需要前置：adventure/ol_betsy）
      'adventure/whos_the_pillager_now', // 现在谁才是掠夺者？ Who's the Pillager Now?（需要前置：adventure/ol_betsy）
      'adventure/craft_decorated_pot_using_only_sherds', // 精修细补 Careful Restoration（需要前置：adventure/salvage_sherd）
      'adventure/adventuring_time', // 探索的时光 Adventuring Time（需要前置：adventure/sleep_in_bed）
      'adventure/play_jukebox_in_meadows', // 音乐之声 Sound of Music（需要前置：adventure/sleep_in_bed）
      'adventure/walk_on_powder_snow_with_leather_boots', // 轻功雪上飘 Light as a Rabbit（需要前置：adventure/sleep_in_bed）
      'adventure/spyglass_at_ghast', // 那是气球吗？ Is It a Balloon?（需要前置：adventure/spyglass_at_parrot）
      'adventure/summon_iron_golem', // 招募援兵 Hired Help（需要前置：adventure/trade）
      'adventure/trade_at_world_height', // 星际商人 Star Trader（需要前置：adventure/trade）
      'adventure/trim_with_all_exclusive_armor_patterns', // 匠心独具 Smithing with Style（需要前置：adventure/trim_with_any_armor_pattern）
      'adventure/hero_of_the_village', // 村庄英雄 Hero of the Village（需要前置：adventure/voluntary_exile）
      'adventure/bullseye', // 正中靶心 Bullseye（需要前置：adventure/shoot_arrow）
      'adventure/sniper_duel', // 狙击手的对决 Sniper Duel（需要前置：adventure/shoot_arrow）
      'adventure/very_very_frightening', // 魔女审判 Very Very Frightening（需要前置：adventure/throw_trident）
      'adventure/spyglass_at_dragon', // 那是飞机吗？ Is It a Plane?（需要前置：adventure/spyglass_at_ghast）
      'adventure/revaulting', // 宝经磨炼 Revaulting（需要前置：adventure/under_lock_and_key）
    ],
  },
  {
    category: 'NETHER',
    name: 'NETHER',
    advancements: [
      'nether/root', // 进入下界维度
      'nether/distract_piglin', // 金光闪闪 Oh Shiny
      'nether/fast_travel', // 曲速泡 Subspace Bubble
      'nether/find_bastion', // 光辉岁月 Those Were the Days
      'nether/find_fortress', // 阴森的要塞 A Terrible Fortress
      'nether/obtain_ancient_debris', // 深藏不露 Hidden in the Depths
      'nether/obtain_crying_obsidian', // 谁在切洋葱？ Who is Cutting Onions?
      'nether/return_to_sender', // 见鬼去吧 Return to Sender
      'nether/ride_strider', // 画船添足 This Boat Has Legs
      'nether/loot_bastion', // 战猪 War Pigs（需要前置：nether/find_bastion）
      'nether/get_wither_skull', // 惊悚恐怖骷髅头 Spooky Scary Skeleton（需要前置：nether/find_fortress）
      'nether/obtain_blaze_rod', // 与火共舞 Into Fire（需要前置：nether/find_fortress）
      'nether/netherite_armor', // 残骸裹身 Cover Me in Debris（需要前置：nether/obtain_ancient_debris）
      'nether/charge_respawn_anchor', // 锚没有九条命 Not Quite "Nine" Lives（需要前置：nether/obtain_crying_obsidian）
      'nether/uneasy_alliance', // 脆弱的同盟 Uneasy Alliance（需要前置：nether/return_to_sender）
      'nether/explore_nether', // 热门景点 Hot Tourist Destinations（需要前置：nether/ride_strider）
      'nether/ride_strider_in_overworld_lava', // 温暖如家 Feels Like Home（需要前置：nether/ride_strider）
      'nether/summon_wither', // 凋零山庄 Withering Heights（需要前置：nether/get_wither_skull）
      'nether/brew_potion', // 本地酿造厂 Local Brewery（需要前置：nether/obtain_blaze_rod）
      'nether/create_beacon', // 带信标回家 Bring Home the Beacon（需要前置：nether/summon_wither）
      'nether/all_potions', // 狂乱的鸡尾酒 A Furious Cocktail（需要前置：nether/brew_potion）
      'nether/create_full_beacon', // 信标工程师 Beaconator（需要前置：nether/create_beacon）
      'nether/all_effects', // 为什么会变成这样呢？ How Did We Get Here?（需要前置：nether/all_potions）
    ],
  },
  {
    category: 'END',
    name: 'END',
    advancements: [
      'end/root', // 末地 The End
      'end/kill_dragon', // 解放末地 Free the End（需要前置：end/root）
      'end/dragon_breath', // 你需要来点薄荷糖 You Need a Mint（需要前置：end/kill_dragon）
      'end/dragon_egg', // 下一世代 The Next Generation（需要前置：end/kill_dragon）
      'end/enter_end_gateway', // 远程折跃 Remote Getaway（需要前置：end/kill_dragon）
      'end/respawn_dragon', // 结束了…再一次… The End... Again...（需要前置：end/kill_dragon）
      'end/find_end_city', // 在游戏尽头的城市 The City at the End of the Game（需要前置：end/enter_end_gateway）
      'end/elytra', // 天空即为极限 Sky's the Limit（需要前置：end/find_end_city）
      'end/levitate', // 这上面的风景不错 Great View From Up Here（需要前置：end/find_end_city）
    ],
  },
  {
    category: 'HUSBANDRY',
    name: 'HUSBANDRY',
    advancements: [
      'husbandry/root', // 农牧业 Husbandry
      'husbandry/allay_deliver_item_to_player', // 找到一个好朋友 You've Got a Friend in Me（隐藏）
      'husbandry/breed_an_animal', // 我从哪儿来？ The Parrots and the Bats
      'husbandry/fishy_business', // 腥味十足的生意 Fishy Business
      'husbandry/make_a_sign_glow', // 眼前一亮！ Glow and Behold!
      'husbandry/obtain_sniffer_egg', // 怪味蛋 Smells Interesting（隐藏）
      'husbandry/place_dried_ghast_in_water', // 补水保湿！ Stay Hydrated!
      'husbandry/plant_seed', // 开荒垦地 A Seedy Place
      'husbandry/ride_a_boat_with_a_goat', // 羊帆起航！ Whatever Floats Your Goat!
      'husbandry/safely_harvest_honey', // 与蜂共舞 Bee Our Guest
      'husbandry/silk_touch_nest', // 举巢搬迁 Total Beelocation
      'husbandry/tadpole_in_a_bucket', // 蚪到桶里来 Bukkit Bukkit
      'husbandry/tame_an_animal', // 永恒的伙伴 Best Friends Forever
      'husbandry/allay_deliver_cake_to_note_block', // 生日快乐歌 Birthday Song（需要前置：husbandry/allay_deliver_item_to_player）
      'husbandry/bred_all_animals', // 成双成对 Two by Two（需要前置：husbandry/breed_an_animal）
      'husbandry/tactical_fishing', // 战术性钓鱼 Tactical Fishing（需要前置：husbandry/fishy_business）
      'husbandry/feed_snifflet', // 小小嗅探兽 Little Sniffs（需要前置：husbandry/obtain_sniffer_egg）
      'husbandry/balanced_diet', // 均衡饮食 A Balanced Diet（需要前置：husbandry/plant_seed）
      'husbandry/obtain_netherite_hoe', // 终极奉献 Serious Dedication（需要前置：husbandry/plant_seed）
      'husbandry/wax_on', // 涂蜡 Wax On（需要前置：husbandry/safely_harvest_honey）
      'husbandry/leash_all_frog_variants', // 呱呱队出动 When the Squad Hops into Town（需要前置：husbandry/tadpole_in_a_bucket）
      'husbandry/repair_wolf_armor', // 完好如初 Good as New（需要前置：husbandry/tame_an_animal）
      'husbandry/remove_wolf_armor', // 华丽一剪 Shear Brilliance（需要前置：husbandry/tame_an_animal）
      'husbandry/complete_catalogue', // 百猫全书 A Complete Catalogue（需要前置：husbandry/tame_an_animal）
      'husbandry/whole_pack', // 群狼聚首 The Whole Pack（需要前置：husbandry/tame_an_animal）
      'husbandry/axolotl_in_a_bucket', // 最萌捕食者 The Cutest Predator（需要前置：husbandry/tactical_fishing）
      'husbandry/plant_any_sniffer_seed', // 播种往事 Planting the Past（需要前置：husbandry/feed_snifflet）
      'husbandry/wax_off', // 脱蜡 Wax Off（需要前置：husbandry/wax_on）
      'husbandry/froglights', // 相映生辉！ With Our Powers Combined!（需要前置：husbandry/leash_all_frog_variants）
      'husbandry/kill_axolotl_target', // 友谊的治愈力！ The Healing Power of Friendship!（需要前置：husbandry/axolotl_in_a_bucket）
    ],
  },
]

