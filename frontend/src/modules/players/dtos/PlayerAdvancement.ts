export interface PlayerAdvancement {
  key: string
  done: boolean
  completed: string[]
  remaining: string[]
}

export interface PlayerAdvancementList {
  advancements: PlayerAdvancement[]
}
