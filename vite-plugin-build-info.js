import { execSync } from 'child_process';

function getGitCommitHash() {
	try {
		return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
	} catch (error) {
		console.warn('Could not get git commit hash:', error);
		return '';
	}
}

function getShortCommitHash() {
	try {
		return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
	} catch (error) {
		console.warn('Could not get short git commit hash:', error);
		return '';
	}
}

export function buildInfoPlugin() {
	return {
		name: 'build-info',
		config() {
			const buildInfo = {
				commitHash: getGitCommitHash(),
				shortCommitHash: getShortCommitHash(),
				githubRepo: 'afneville/photos',
				buildTime: new Date().toISOString()
			};

			return {
				define: {
					__BUILD_INFO__: JSON.stringify(buildInfo)
				}
			};
		}
	};
}
