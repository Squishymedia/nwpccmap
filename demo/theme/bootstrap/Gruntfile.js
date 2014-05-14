module.exports = function(grunt) {
  grunt.initConfig({
    less: {
      production: {
         options: {
             paths: ["assets/css"],
             cleancss: true
         },
         files: {"../css/npc.css": "less/npc.less"}
      }
    },
    watch: {
      files: ['less/*.less'],
      tasks: ['less']
    }   
   });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['less']);
};

