@Library('Shared') _

pipeline_with_docker("small") {
    pipelineStages {
        stage("Prepare") {
          cleanWs();
          checkout([$class: 'GitSCM', branches: [[name: '${branch_name}']],  doGenerateSubmoduleConfigurations: false, extensions: [[$class: 'LocalBranch', localBranch: '${branch_name}']], submoduleCfg: [], userRemoteConfigs: [[credentialsId: 'sitegen-github-token-user', url: 'https://github.com/SalesforceCommerceCloud/sitegenesis.git']]])
        }
        stage("Build") {
            withCredentials([file(credentialsId: 'maven_settings', variable: 'maven_settings'),
                sshUserPrivateKey(credentialsId: 'githubcloudkey', keyFileVariable: 'git_key', passphraseVariable: '', usernameVariable: 'jenkins')]) {
                sh """
                    echo "PATH=\$PATH:/usr/bin:/usr/local/bin" >> foo
                    echo "npm -version" >> foo
                    echo "node --version" >> foo
                    docker run --net="host" --privileged --rm  \
                    -e USER_ID=`id -u` \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v ${pwd()}/foo:/etc/local/foo \
                    -v ${maven_settings}:/home/build/.m2/settings.xml \
                    -v ~/.m2/repository:/home/build/.m2/repository \
                    -v /home/ec2-user/.gitconfig:/home/ec2-user/.gitconfig \
                    -v ${git_key}:/home/build/.ssh/id_rsa \
                    -v ~/.ssh/known_hosts:/home/build/.ssh/known_hosts \
                    -v ${pwd()}/.docker:/home/build/.docker \
                    -v ${pwd()}:/work \
                    docker-registry.releng.demandware.net/common/centos-openjdk-maven-nodejs:maven-3.5.3-node-10.13.0-certFix \
                    bash -c 'export PATH=$PATH:/usr/local/bin; git config --global url.https://github.com/.insteadOf git://github.com/ ; npm install --registry https://registry.npmjs.org/; npm run build; npm run test:unit; rm -rf app_storefront_richUI; cp -ar app_storefront_core app_storefront_richUI; mvn -U -B clean deploy '
                          
                  """
                }

            }
    }
}

