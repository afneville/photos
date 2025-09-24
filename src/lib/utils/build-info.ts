declare global {
	const __BUILD_INFO__: {
		commitHash: string;
		shortCommitHash: string;
		githubRepo: string;
		buildTime: string;
	};
}

export const BUILD_INFO = __BUILD_INFO__;
