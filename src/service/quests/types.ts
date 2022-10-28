// tslint:disable: no-magic-numbers
export type Random = {
    startTime: string;
    group1Amount: number;
    group2Amount: number;
    group1Length: number;
    group2Length: number;

    group1Ids: string[];
    group2Ids: string[];
};

export type Repeating = {
    maxInARow: number;
    timesCompleted: number;
    timesCompletedInARow: number;
};

export type Chest = {
    id: string;
    actual: number;
    required: number;
    pictureUrl: string;
};

export type VaultGoal = {
    id: string;
    name: string;
    isGoal: boolean;
    emoji: string;
    url: string;
    progress: string;
    completed: boolean;
    lastWeekBase: number;
    actual: number;
};

export type Quest = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    pictureUrl: string;
    // repeating = 2; else = 3
    priority: 2 | 3;
    type: string;
    url: string;

    categoryId: string;
    rewardIds: string[];
    goalId: string;

    random?: Random;
    repeating?: Repeating;
};
