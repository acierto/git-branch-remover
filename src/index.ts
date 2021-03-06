import {exec} from 'child_process';

const TIMEOUT = 1000;
const RETENTION_IN_DAYS = 7;

const getCurrentDayOfYear = () => {
    const now: any = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return getDaysInMonth(month) * month + day;
};

const getDaysInMonth = (month: number) => new Date(new Date().getFullYear(), month, 0).getDate();

const getBranchDayOfYear = (name: string) => {
    const tokens = name.split('-');
    const monthAndDay = tokens[tokens.length - 1].split('.')[0];
    if (monthAndDay.length === 3) {
        const month = parseInt(monthAndDay[0], 10);
        const day = parseInt(monthAndDay.slice(1, 3), 10);
        return getDaysInMonth(month) * month + day;
    } else {
        const month = parseInt(monthAndDay.slice(0, 2), 10);
        const day = parseInt(monthAndDay.slice(2, 4), 10);
        return getDaysInMonth(month) * month + day;
    }
};

const getAllBranchesRelease = () => new Promise<string[]>((resolve, reject) => {
    const command = 'git branch -a | egrep \'remotes/origin/[[:digit:]]{1,3}[.]+[[:digit:]]{1,3}[.]*[[:digit:]]{1,3}-[[:digit:]]{3,4}[.][[:digit:]]{3,4}\'';
    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            reject(error.message);
            return;
        }
        if (stderr) {
            reject(stderr);
            return;
        }
        resolve(stdout.split('\n').filter(b => b).map(b => b.trim().split('/')[2]));
    });
});

(async () => {
    const branchNames: string[] = await getAllBranchesRelease();
    console.log(`Found branches matching the regex: ${branchNames}`);

    const current = getCurrentDayOfYear();

    const outdatedBranches = branchNames.filter(branchName =>
        current - getBranchDayOfYear(branchName) > RETENTION_IN_DAYS);

    const commands = outdatedBranches.map(branchName =>
        `git push origin --delete ${branchName} || echo branch '${branchName}' does not exist`);

    for (let i = 0; i < commands.length; i++) {
        setTimeout(() => {
            const command = commands[i];
            exec(command, (error, stdout, stderr) => {
                console.log(`Executing: ${command}`);

                if (error) {
                    console.log(`error: ${error.message}`);
                } else if (stderr) {
                    console.log(`stderr: ${stderr}`);
                }
            });
        }, TIMEOUT * i);
    }
})();
